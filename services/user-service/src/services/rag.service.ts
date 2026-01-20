import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import { PineconeStore } from '@langchain/pinecone';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { Document } from '@langchain/core/documents';
import { PromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { RunnableSequence, RunnablePassthrough } from '@langchain/core/runnables';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PDFParse } = require('pdf-parse');
import mammoth from 'mammoth';
import { prisma } from '../lib/prisma';
import { getResourcesIndex, RESOURCES_NAMESPACE } from '../lib/pinecone';
import { logger } from '../utils/logger';

// Initialize OpenAI models
const embeddings = new OpenAIEmbeddings({
  openAIApiKey: process.env.OPENAI_API_KEY,
  modelName: 'text-embedding-3-small',
});

const llm = new ChatOpenAI({
  openAIApiKey: process.env.OPENAI_API_KEY,
  modelName: 'gpt-4o-mini',
  temperature: 0.3,
  streaming: true,
});

// Text splitter for chunking documents
const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
  separators: ['\n\n', '\n', '. ', ' ', ''],
});

// RAG Prompt Template
const ragPromptTemplate = PromptTemplate.fromTemplate(`
You are a helpful study assistant for university students. Answer questions based on the provided study materials.
Always cite your sources by mentioning the resource title and page number when available.
If the answer is not in the context, say "I couldn't find information about this in the uploaded study materials."

Context from study materials:
{context}

Question: {question}

Answer (be helpful, accurate, and cite sources):
`);

export interface DocumentChunk {
  content: string;
  metadata: {
    resourceId: string;
    pageNumber?: number;
    chunkIndex: number;
    title: string;
    fileType: string;
  };
}

export class RAGService {
  private vectorStore: PineconeStore | null = null;

  /**
   * Initialize the vector store
   */
  async initVectorStore() {
    if (this.vectorStore) return this.vectorStore;

    try {
      const index = getResourcesIndex();
      this.vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
        pineconeIndex: index as any,
        namespace: RESOURCES_NAMESPACE,
      });
      logger.info('Vector store initialized');
      return this.vectorStore;
    } catch (error) {
      logger.error('Failed to initialize vector store:', error);
      throw error;
    }
  }

  /**
   * Extract text from a document based on its type
   */
  async extractText(fileBuffer: Buffer, mimeType: string): Promise<{ text: string; pages?: number }> {
    try {
      if (mimeType === 'application/pdf') {
        try {
          // Convert Buffer to Uint8Array for PDFParse
          const uint8Array = new Uint8Array(fileBuffer);
          const parser = new PDFParse(uint8Array);
          await parser.load();
          const textResult = await parser.getText();
          const text = textResult.text || '';
          
          logger.info(`[RAG] Extracted PDF text: ${text.length} chars, ${textResult.pages?.length} pages. Sample: "${text.substring(0, 30).replace(/\n/g, ' ')}..."`);
          
          return { text, pages: textResult.pages?.length || 1 };
        } catch (pdfError) {
          logger.error('PDF parsing error:', pdfError);
          return { text: '' };
        }
      }

      if (mimeType.includes('word') || mimeType.includes('document')) {
        try {
          const result = await mammoth.extractRawText({ buffer: fileBuffer });
          return { text: result.value };
        } catch (wordError) {
          logger.error('Word document parsing error:', wordError);
          return { text: '' };
        }
      }

      // For PPTX and other formats, return empty for now
      // Can be extended with pptx-parser or similar
      logger.warn(`Unsupported file type for text extraction: ${mimeType}`);
      return { text: '' };
    } catch (error) {
      logger.error('Text extraction error:', error);
      return { text: '' }; // Return empty instead of throwing to not break the upload
    }
  }

  /**
   * Process and embed a resource document
   */
  async processResource(resourceId: string, fileBuffer: Buffer, mimeType: string): Promise<void> {
    try {
      // Get resource details
      const resource = await prisma.resource.findUnique({
        where: { id: resourceId },
        select: { id: true, title: true, fileType: true },
      });

      if (!resource) {
        throw new Error('Resource not found');
      }

      // Extract text
      const { text: extractedText, pages } = await this.extractText(fileBuffer, mimeType);
      
      // Ensure text is a string
      const text = typeof extractedText === 'string' ? extractedText : String(extractedText || '');

      if (!text || text.length < 50) {
        logger.warn(`Insufficient text content for resource ${resourceId}: ${text.length} chars`);
        await prisma.resource.update({
          where: { id: resourceId },
          data: { isProcessed: true },
        });
        return;
      }

      logger.info(`[RAG] Processing resource ${resourceId}: ${text.length} chars, ~${pages || 'unknown'} pages`);

      // Split into chunks
      const chunks = await textSplitter.splitText(text);
      
      logger.info(`[RAG] Split into ${chunks.length} chunks`);

      // Create documents with metadata
      const documents: Document[] = chunks.map((chunk, index) => ({
        pageContent: chunk,
        metadata: {
          resourceId: resource.id,
          title: resource.title,
          fileType: resource.fileType,
          chunkIndex: index,
          pageNumber: pages ? Math.ceil((index + 1) / (chunks.length / pages)) : undefined,
        },
      }));

      // Initialize vector store
      const vectorStore = await this.initVectorStore();

      // Generate unique IDs for each chunk
      const ids = documents.map((_, index) => `${resourceId}-chunk-${index}`);

      logger.info(`[RAG] Adding ${documents.length} documents to Pinecone with namespace: ${RESOURCES_NAMESPACE}`);
      
      // Add to vector store
      await vectorStore.addDocuments(documents, { ids });
      
      logger.info(`[RAG] Successfully added ${documents.length} embeddings to Pinecone`);

      // Store embedding references in database
      for (let i = 0; i < documents.length; i++) {
        const doc = documents[i];
        await prisma.resourceEmbedding.create({
          data: {
            resourceId,
            pineconeId: ids[i]!,
            chunkIndex: i,
            pageNumber: (doc?.metadata?.pageNumber as number) || null,
            chunkText: doc?.pageContent?.substring(0, 500) || '', // Store first 500 chars
          },
        });
      }

      // Mark resource as processed
      await prisma.resource.update({
        where: { id: resourceId },
        data: { isProcessed: true },
      });

      logger.info(`Resource ${resourceId} processed with ${chunks.length} chunks`);
    } catch (error) {
      logger.error(`Error processing resource ${resourceId}:`, error);
      throw error;
    }
  }

  /**
   * Query resources using RAG
   */
  async query(
    question: string,
    filters?: { courseId?: string; resourceIds?: string[] },
    topK = 5
  ): Promise<{ answer: string; sources: any[] }> {
    try {
      logger.info(`[RAG Query] Question: "${question.substring(0, 50)}..." | Filters: ${JSON.stringify(filters)} | TopK: ${topK}`);
      
      const vectorStore = await this.initVectorStore();

      // Build filter for Pinecone
      const pineconeFilter: any = {};
      if (filters?.resourceIds && filters.resourceIds.length > 0) {
        pineconeFilter.resourceId = { $in: filters.resourceIds };
      }

      logger.info(`[RAG Query] Pinecone filter: ${JSON.stringify(pineconeFilter)}`);

      // Retrieve relevant documents
      const retriever = vectorStore.asRetriever({
        k: topK,
        filter: Object.keys(pineconeFilter).length > 0 ? pineconeFilter : undefined,
      });

      const docs = await retriever.invoke(question);
      
      logger.info(`[RAG Query] Retrieved ${docs.length} documents`);
      if (docs.length > 0) {
        logger.info(`[RAG Query] First doc title: ${docs[0]?.metadata?.title || 'N/A'}, content length: ${docs[0]?.pageContent?.length || 0}`);
      }

      if (docs.length === 0) {
        logger.warn(`[RAG Query] No documents found for question: "${question.substring(0, 50)}..."`);
        return {
          answer: "I couldn't find any relevant information in the study materials. Please make sure documents have been uploaded and processed.",
          sources: [],
        };
      }

      // Format context
      const context = docs
        .map((doc, i) => `[Source ${i + 1}: ${doc.metadata.title}${doc.metadata.pageNumber ? `, Page ${doc.metadata.pageNumber}` : ''}]\n${doc.pageContent}`)
        .join('\n\n');

      // Build RAG chain
      const chain = RunnableSequence.from([
        {
          context: () => context,
          question: new RunnablePassthrough(),
        },
        ragPromptTemplate,
        llm,
        new StringOutputParser(),
      ]);

      // Get answer
      const answer = await chain.invoke(question);

      // Get unique sources
      const sources = docs.map((doc) => ({
        resourceId: doc.metadata.resourceId,
        title: doc.metadata.title,
        pageNumber: doc.metadata.pageNumber,
        excerpt: doc.pageContent.substring(0, 200) + '...',
      }));

      // Deduplicate sources by resourceId
      const uniqueSources = sources.reduce((acc: any[], source) => {
        if (!acc.find((s) => s.resourceId === source.resourceId)) {
          acc.push(source);
        }
        return acc;
      }, []);

      return { answer, sources: uniqueSources };
    } catch (error) {
      logger.error('RAG query error:', error);
      throw error;
    }
  }

  /**
   * Stream a RAG response (for real-time UI updates)
   */
  async *streamQuery(
    question: string,
    filters?: { courseId?: string; resourceIds?: string[] },
    topK = 5
  ): AsyncGenerator<{ type: 'sources' | 'token' | 'done'; data: any }> {
    try {
      const vectorStore = await this.initVectorStore();

      // Build filter
      const pineconeFilter: any = {};
      if (filters?.resourceIds && filters.resourceIds.length > 0) {
        pineconeFilter.resourceId = { $in: filters.resourceIds };
      }

      // Retrieve relevant documents
      const retriever = vectorStore.asRetriever({
        k: topK,
        filter: Object.keys(pineconeFilter).length > 0 ? pineconeFilter : undefined,
      });

      const docs = await retriever.invoke(question);

      // Yield sources first
      const sources = docs.map((doc) => ({
        resourceId: doc.metadata.resourceId,
        title: doc.metadata.title,
        pageNumber: doc.metadata.pageNumber,
      }));

      const uniqueSources = sources.reduce((acc: any[], source) => {
        if (!acc.find((s) => s.resourceId === source.resourceId)) {
          acc.push(source);
        }
        return acc;
      }, []);

      yield { type: 'sources', data: uniqueSources };

      if (docs.length === 0) {
        yield { type: 'token', data: "I couldn't find any relevant information in the study materials." };
        yield { type: 'done', data: null };
        return;
      }

      // Format context
      const context = docs
        .map((doc, i) => `[Source ${i + 1}: ${doc.metadata.title}]\n${doc.pageContent}`)
        .join('\n\n');

      // Stream response
      const streamingLlm = new ChatOpenAI({
        openAIApiKey: process.env.OPENAI_API_KEY,
        modelName: 'gpt-4o-mini',
        temperature: 0.3,
        streaming: true,
      });

      const prompt = await ragPromptTemplate.format({ context, question });

      const stream = await streamingLlm.stream(prompt);

      for await (const chunk of stream) {
        if (chunk.content) {
          yield { type: 'token', data: chunk.content };
        }
      }

      yield { type: 'done', data: null };
    } catch (error) {
      logger.error('RAG stream error:', error);
      throw error;
    }
  }

  /**
   * Delete embeddings for a resource
   */
  async deleteResourceEmbeddings(resourceId: string): Promise<void> {
    try {
      const index = getResourcesIndex();

      // Get all embedding IDs for this resource
      const embeddings = await prisma.resourceEmbedding.findMany({
        where: { resourceId },
        select: { pineconeId: true },
      });

      if (embeddings.length > 0) {
        await index.namespace(RESOURCES_NAMESPACE).deleteMany(embeddings.map((e) => e.pineconeId));
      }

      // Delete from database
      await prisma.resourceEmbedding.deleteMany({
        where: { resourceId },
      });

      logger.info(`Deleted embeddings for resource ${resourceId}`);
    } catch (error) {
      logger.error(`Error deleting embeddings for ${resourceId}:`, error);
      throw error;
    }
  }
}

export const ragService = new RAGService();

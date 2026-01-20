import { Router, Request, Response, NextFunction } from 'express';
import { ragService } from '../services/rag.service';
import { resourceService } from '../services/resource.service';
import { logger } from '../utils/logger';
import jwt from 'jsonwebtoken';
import axios from 'axios';

const router = Router();

// Helper to get user ID from request
const getUserId = (req: Request): string | null => {
  const headerId = req.headers['x-user-id'] as string;
  if (headerId) return headerId;

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      if (!token) return null;
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret') as any;
      return decoded.id || decoded.userId;
    } catch {
      return null;
    }
  }
  return null;
};

// Auth middleware
const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return;
  }
  (req as any).userId = userId;
  next();
};

import { ChatOpenAI } from '@langchain/openai';

// LLM for intent classification
const intentClassifier = new ChatOpenAI({
  openAIApiKey: process.env.OPENAI_API_KEY,
  modelName: 'gpt-4o-mini',
  temperature: 0,
});

interface IntentClassification {
  intent: 'list_resources' | 'search_content' | 'count_resources' | 'out_of_scope';
  resourceType?: string; // lecture_notes, exam, assignment, textbook, slide_deck, lab_report, project, any
  explanation: string;
}

/**
 * Use LLM to classify user intent - much smarter than keyword matching
 */
const classifyIntent = async (question: string): Promise<IntentClassification> => {
  const systemPrompt = `You are an intent classifier for a university study materials platform.
Your job is to understand what the user wants and classify their request.

IMPORTANT BOUNDARIES:
- This platform ONLY contains uploaded study materials (PDFs, documents, slides, etc.)
- You should NEVER answer general knowledge questions from training data
- If someone asks about topics NOT related to finding/listing study materials, classify as "out_of_scope"

Available intents:
1. "list_resources" - User wants to see/find/list study materials (notes, exams, assignments, etc.)
2. "search_content" - User wants to search WITHIN uploaded documents for specific information
3. "count_resources" - User wants to know how many resources exist
4. "out_of_scope" - Question is NOT about study materials (general knowledge, personal questions, etc.)

Available resource types:
- lecture_notes: Class notes, lecture summaries
- exam: Past papers, tests, quizzes, midterms, finals
- assignment: Homework, tasks, problem sets
- textbook: Books, readings
- slide_deck: Presentations, slides, PowerPoints
- lab_report: Lab work, practicals
- project: Project reports, coursework
- any: User wants all types or didn't specify

Respond in JSON format:
{
  "intent": "list_resources" | "search_content" | "count_resources" | "out_of_scope",
  "resourceType": "lecture_notes" | "exam" | "assignment" | "textbook" | "slide_deck" | "lab_report" | "project" | "any",
  "explanation": "Brief reason for this classification"
}`;

  try {
    const response = await intentClassifier.invoke([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: question }
    ]);

    const content = response.content.toString();
    // Parse JSON from response (handle markdown code blocks)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    // Default fallback
    return { intent: 'search_content', resourceType: 'any', explanation: 'Could not parse, defaulting to search' };
  } catch (error) {
    logger.error('Intent classification error:', error);
    return { intent: 'search_content', resourceType: 'any', explanation: 'Classification failed' };
  }
};

/**
 * POST /rag/query - Ask a question using RAG with hierarchical context filtering
 * 
 * Supports filtering by:
 * - schoolId: Get resources from all courses in a school
 * - courseId: Get resources from all units in a course  
 * - unitId: Get resources from a specific unit
 * - resourceIds: Specific resource IDs (highest priority)
 * 
 * Also detects intent for resource type queries like "find lecture notes"
 */
router.post('/query', requireAuth, async (req: Request, res: Response) => {
  try {
    const { question, resourceIds, schoolId, courseId, unitId, topK } = req.body;

    if (!question || question.trim().length < 3) {
      return res.status(400).json({
        success: false,
        error: 'Question must be at least 3 characters',
      });
    }

    const { prisma } = await import('../lib/prisma');
    
    // Use LLM to classify intent - smarter than keyword matching
    const intentResult = await classifyIntent(question);
    
    logger.info(`[RAG] LLM Intent classification: ${JSON.stringify(intentResult)}`);

    // Handle out of scope questions
    if (intentResult.intent === 'out_of_scope') {
      return res.json({
        success: true,
        data: {
          answer: "I'm your study materials assistant. I can only help you find, list, or search within uploaded study resources (lecture notes, exams, assignments, etc.). I can't answer general knowledge questions.\n\nTry asking:\n- \"Show me all lecture notes\"\n- \"Find past exams\"\n- \"What does this document say about [topic]?\"",
          sources: [],
        },
      });
    }

    // Build hierarchical where clause for resources
    const buildWhereClause = (extraFilters?: any) => {
      const where: any = { status: 'active', ...extraFilters };
      
      if (resourceIds && Array.isArray(resourceIds) && resourceIds.length > 0) {
        where.id = { in: resourceIds };
      } else if (unitId) {
        where.unitId = unitId;
      } else if (courseId) {
        where.unit = { yearOfStudy: { courseId } };
      } else if (schoolId) {
        where.unit = { yearOfStudy: { course: { schoolId } } };
      }
      
      return where;
    };

    // Handle count_resources intent
    if (intentResult.intent === 'count_resources') {
      const whereClause = buildWhereClause(
        intentResult.resourceType && intentResult.resourceType !== 'any' 
          ? { resourceType: intentResult.resourceType } 
          : undefined
      );
      
      const count = await prisma.resource.count({ where: whereClause });
      const typeLabel = intentResult.resourceType !== 'any' ? intentResult.resourceType?.replace('_', ' ') + 's' : 'resources';
      
      return res.json({
        success: true,
        data: {
          answer: `There are **${count} ${typeLabel}** available in this context.`,
          sources: [],
        },
      });
    }

    // Handle list_resources intent
    if (intentResult.intent === 'list_resources') {
      const whereClause = buildWhereClause(
        intentResult.resourceType && intentResult.resourceType !== 'any' 
          ? { resourceType: intentResult.resourceType } 
          : undefined
      );
      
      const resources = await prisma.resource.findMany({
        where: whereClause,
        take: 20,
        orderBy: { upvoteCount: 'desc' },
        select: {
          id: true,
          title: true,
          description: true,
          fileType: true,
          resourceType: true,
          upvoteCount: true,
          downloadCount: true,
          uploader: {
            select: { displayName: true, username: true }
          }
        }
      });

      if (resources.length === 0) {
        const typeLabel = intentResult.resourceType !== 'any' 
          ? intentResult.resourceType?.replace('_', ' ') + 's' 
          : 'resources';
        return res.json({
          success: true,
          data: {
            answer: `I couldn't find any ${typeLabel} in this context yet. Try uploading some or expanding your search.`,
            sources: [],
          },
        });
      }

      const typeLabel = intentResult.resourceType !== 'any' 
        ? intentResult.resourceType?.replace('_', ' ') 
        : 'resource';
      const answer = `Found **${resources.length} ${typeLabel}${resources.length !== 1 ? 's' : ''}**:\n\n${resources.slice(0, 10).map((r, i) => 
        `${i + 1}. **${r.title}** - ${r.upvoteCount || 0} upvotes`
      ).join('\n')}${resources.length > 10 ? `\n\n_...and ${resources.length - 10} more_` : ''}`;

      return res.json({
        success: true,
        data: {
          answer,
          sources: resources.map(r => ({
            resourceId: r.id,
            id: r.id,
            title: r.title,
            fileType: r.fileType,
            resourceType: r.resourceType,
            upvoteCount: r.upvoteCount,
          })),
        },
      });
    }

    // For search_content intent - use RAG to search within documents
    // Build hierarchical filter for RAG
    const filters: any = {};
    
    if (resourceIds && Array.isArray(resourceIds) && resourceIds.length > 0) {
      filters.resourceIds = resourceIds;
    } else if (unitId) {
      const unitResources = await prisma.resource.findMany({
        where: { unitId, status: 'active' },
        select: { id: true },
      });
      filters.resourceIds = unitResources.map(r => r.id);
      logger.info(`[RAG] Filtering by unit ${unitId}: ${filters.resourceIds.length} resources`);
    } else if (courseId) {
      const courseResources = await prisma.resource.findMany({
        where: {
          status: 'active',
          unit: { yearOfStudy: { courseId } },
        },
        select: { id: true },
      });
      filters.resourceIds = courseResources.map(r => r.id);
      logger.info(`[RAG] Filtering by course ${courseId}: ${filters.resourceIds.length} resources`);
    } else if (schoolId) {
      const schoolResources = await prisma.resource.findMany({
        where: {
          status: 'active',
          unit: { yearOfStudy: { course: { schoolId } } },
        },
        select: { id: true },
      });
      filters.resourceIds = schoolResources.map(r => r.id);
      logger.info(`[RAG] Filtering by school ${schoolId}: ${filters.resourceIds.length} resources`);
    }

    // Check if we have any resources to search
    if (filters.resourceIds && filters.resourceIds.length === 0) {
      return res.json({
        success: true,
        data: {
          answer: "There are no study materials uploaded in this context yet. Please upload some resources first.",
          sources: [],
        },
      });
    }

    const result = await ragService.query(question.trim(), filters, topK || 10);

    return res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    logger.error('RAG query error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to process question',
    });
  }
});

/**
 * POST /rag/stream - Stream a RAG response using SSE with hierarchical filtering
 */
router.post('/stream', requireAuth, async (req: Request, res: Response) => {
  try {
    const { question, resourceIds, schoolId, courseId, unitId, topK } = req.body;

    if (!question || question.trim().length < 3) {
      return res.status(400).json({
        success: false,
        error: 'Question must be at least 3 characters',
      });
    }

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    // Build hierarchical filter (same logic as /query)
    const filters: any = {};
    const { prisma } = await import('../lib/prisma');
    
    if (resourceIds && Array.isArray(resourceIds) && resourceIds.length > 0) {
      filters.resourceIds = resourceIds;
    } else if (unitId) {
      const unitResources = await prisma.resource.findMany({
        where: { unitId, status: 'active' },
        select: { id: true },
      });
      filters.resourceIds = unitResources.map(r => r.id);
    } else if (courseId) {
      const courseResources = await prisma.resource.findMany({
        where: {
          status: 'active',
          unit: { yearOfStudy: { courseId } },
        },
        select: { id: true },
      });
      filters.resourceIds = courseResources.map(r => r.id);
    } else if (schoolId) {
      const schoolResources = await prisma.resource.findMany({
        where: {
          status: 'active',
          unit: { yearOfStudy: { course: { schoolId } } },
        },
        select: { id: true },
      });
      filters.resourceIds = schoolResources.map(r => r.id);
    }

    // Check if we have resources
    if (filters.resourceIds && filters.resourceIds.length === 0) {
      res.write(`data: ${JSON.stringify({ type: 'text', data: 'No study materials found in this context yet.' })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
      return;
    }

    // Stream the response
    const stream = ragService.streamQuery(question.trim(), filters, topK || 10);

    for await (const chunk of stream) {
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      
      if (typeof (res as any).flush === 'function') {
        (res as any).flush();
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
    return;
  } catch (error: any) {
    logger.error('RAG stream error:', error);
    
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to stream response',
      });
    }
    
    res.write(`data: ${JSON.stringify({ type: 'error', data: error.message })}\n\n`);
    res.end();
    return;
  }
});

/**
 * POST /rag/process/:resourceId - Manually trigger processing of a resource
 */
router.post('/process/:resourceId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { resourceId } = req.params as { resourceId: string };
    const userId = (req as any).userId;

    // Get resource to verify ownership
    const resource = await resourceService.getResourceById(resourceId, userId);

    if (!resource) {
      return res.status(404).json({ success: false, error: 'Resource not found' });
    }

    // Only owner or admin can trigger processing
    if (resource.uploaderId !== userId) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    if (resource.isProcessed) {
      return res.json({
        success: true,
        message: 'Resource already processed',
      });
    }

    // Fetch the file and process it
    const fileResponse = await axios.get(resource.fileUrl, {
      responseType: 'arraybuffer',
    });

    await ragService.processResource(resourceId, Buffer.from(fileResponse.data), resource.mimeType);

    return res.json({
      success: true,
      message: 'Resource processed successfully',
    });
  } catch (error: any) {
    logger.error('RAG process error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to process resource',
    });
  }
});

/**
 * DELETE /rag/:resourceId - Delete embeddings for a resource
 */
router.delete('/:resourceId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { resourceId } = req.params as { resourceId: string };
    const userId = (req as any).userId;

    // Get resource to verify ownership
    const resource = await resourceService.getResourceById(resourceId, userId);

    if (!resource) {
      return res.status(404).json({ success: false, error: 'Resource not found' });
    }

    if (resource.uploaderId !== userId) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    await ragService.deleteResourceEmbeddings(resourceId);

    return res.json({
      success: true,
      message: 'Embeddings deleted successfully',
    });
  } catch (error: any) {
    logger.error('RAG delete error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete embeddings',
    });
  }
});

/**
 * GET /rag/health - Check RAG service health
 */
router.get('/health', async (_req: Request, res: Response) => {
  try {
    await ragService.initVectorStore();
    return res.json({
      success: true,
      status: 'healthy',
      message: 'RAG service is operational',
    });
  } catch (error: any) {
    return res.status(503).json({
      success: false,
      status: 'unhealthy',
      error: error.message,
    });
  }
});

/**
 * GET /rag/stats - Get RAG embedding statistics (for debugging)
 */
router.get('/stats', requireAuth, async (_req: Request, res: Response) => {
  try {
    // Import prisma here to avoid circular deps
    const { prisma } = await import('../lib/prisma');
    
    // Count total embeddings
    const totalEmbeddings = await prisma.resourceEmbedding.count();
    
    // Count processed resources
    const processedResources = await prisma.resource.count({
      where: { isProcessed: true },
    });
    
    // Count total resources
    const totalResources = await prisma.resource.count();
    
    // Get recent embeddings
    const recentEmbeddings = await prisma.resourceEmbedding.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        resource: {
          select: { title: true, fileType: true },
        },
      },
    });
    
    return res.json({
      success: true,
      data: {
        totalEmbeddings,
        processedResources,
        totalResources,
        unprocessedResources: totalResources - processedResources,
        recentEmbeddings: recentEmbeddings.map((e) => ({
          id: e.id,
          resourceTitle: e.resource.title,
          fileType: e.resource.fileType,
          chunkIndex: e.chunkIndex,
          createdAt: e.createdAt,
        })),
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /rag/pinecone-stats - Get Pinecone index stats (for debugging)
 */
router.get('/pinecone-stats', requireAuth, async (_req: Request, res: Response) => {
  try {
    const { getResourcesIndex, RESOURCES_NAMESPACE } = await import('../lib/pinecone');
    const index = getResourcesIndex();
    
    // Get index stats
    const stats = await index.describeIndexStats();
    
    return res.json({
      success: true,
      data: {
        indexName: process.env.PINECONE_INDEX_NAME || 'uni-resources',
        namespace: RESOURCES_NAMESPACE,
        stats,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;


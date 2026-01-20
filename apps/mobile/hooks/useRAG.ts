import { useState, useCallback, useRef } from 'react';
import { useApi } from './useApi';
import { streamRequest } from '../utils/streamHelper';

export interface RAGSource {
  resourceId: string;
  title: string;
  pageNumber?: number;
  excerpt?: string;
}

export interface RAGMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  sources?: RAGSource[];
  timestamp: Date;
  isStreaming?: boolean;
}

export function useRAG() {
  const { post } = useApi();
  const [messages, setMessages] = useState<RAGMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Add a user message
  const addUserMessage = useCallback((content: string): string => {
    const id = `user-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id,
        type: 'user',
        content,
        timestamp: new Date(),
      },
    ]);
    return id;
  }, []);

  // Standard query (non-streaming)
  const query = useCallback(
    async (
      question: string,
      filters?: { resourceIds?: string[]; courseId?: string }
    ): Promise<void> => {
      try {
        setIsLoading(true);
        addUserMessage(question);

        const response = await post('/rag/query', {
          question,
          resourceIds: filters?.resourceIds,
          courseId: filters?.courseId,
        });

        if (response.success) {
          setMessages((prev) => [
            ...prev,
            {
              id: `assistant-${Date.now()}`,
              type: 'assistant',
              content: response.data.answer,
              sources: response.data.sources,
              timestamp: new Date(),
            },
          ]);
        } else {
          setMessages((prev) => [
            ...prev,
            {
              id: `error-${Date.now()}`,
              type: 'assistant',
              content: 'Sorry, I encountered an error processing your question.',
              timestamp: new Date(),
            },
          ]);
        }
      } catch (error) {
        console.error('RAG query error:', error);
        setMessages((prev) => [
          ...prev,
          {
            id: `error-${Date.now()}`,
            type: 'assistant',
            content: 'Sorry, I encountered an error processing your question.',
            timestamp: new Date(),
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [post, addUserMessage]
  );

  // Streaming query using SSE
  const streamQuery = useCallback(
    async (
      question: string,
      filters?: { resourceIds?: string[]; courseId?: string }
    ): Promise<void> => {
      try {
        setIsLoading(true);
        setIsStreaming(true);
        addUserMessage(question);

        // Create a placeholder for the assistant response
        const assistantId = `assistant-${Date.now()}`;
        setMessages((prev) => [
          ...prev,
          {
            id: assistantId,
            type: 'assistant',
            content: '',
            sources: [],
            timestamp: new Date(),
            isStreaming: true,
          },
        ]);

        abortControllerRef.current = new AbortController();

        let accumulatedContent = '';
        let accumulatedSources: RAGSource[] = [];

        await streamRequest(
          '/rag/stream',
          {
            question,
            resourceIds: filters?.resourceIds,
            courseId: filters?.courseId,
          },
          {
            onChunk: (chunk: { type: string; data: any }) => {
              if (chunk.type === 'token') {
                accumulatedContent += chunk.data;
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantId
                      ? { ...msg, content: accumulatedContent }
                      : msg
                  )
                );
              } else if (chunk.type === 'sources') {
                accumulatedSources = chunk.data;
                 setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantId
                      ? { ...msg, sources: accumulatedSources }
                      : msg
                  )
                );
              }
            },
           onComplete: () => {
             setIsStreaming(false);
             setIsLoading(false);
             setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantId
                    ? { ...msg, isStreaming: false }
                    : msg
                )
             );
           },
           onError: (error) => {
             console.error('Stream error:', error);
             setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantId
                    ? { ...msg, isStreaming: false, content: accumulatedContent + (accumulatedContent ? '\n\n' : '') + '[Error: Connection interrupted]' }
                    : msg
                )
             );
             setIsStreaming(false);
             setIsLoading(false);
           }
          },
          abortControllerRef.current
        );

      } catch (error) {
        console.error('RAG stream setup error:', error);
        setIsLoading(false);
        setIsStreaming(false);
      }
    },
    [addUserMessage]
  );

  // Cancel ongoing stream
  const cancelStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsStreaming(false);
    }
  }, []);

  // Clear chat history
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  // Process a resource for RAG
  const processResource = useCallback(
    async (resourceId: string): Promise<boolean> => {
      try {
        const response = await post(`/rag/process/${resourceId}`);
        return response.success;
      } catch (error) {
        console.error('Error processing resource:', error);
        return false;
      }
    },
    [post]
  );

  return {
    messages,
    isLoading,
    isStreaming,
    query,
    streamQuery,
    cancelStream,
    clearMessages,
    processResource,
  };
}

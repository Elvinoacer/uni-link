import { Pinecone } from '@pinecone-database/pinecone';
import { logger } from '../utils/logger';

// Singleton instance
let pineconeInstance: Pinecone | null = null;

const getPineconeClient = () => {
  if (pineconeInstance) return pineconeInstance;

  const apiKey = process.env.PINECONE_API_KEY;
  if (!apiKey) {
    logger.warn('PINECONE_API_KEY is not set. RAG features will not work.');
    // Return a dummy object or throw only when used? 
    // For now we throw here but only when this function is called, not at module load time.
    throw new Error('PINECONE_API_KEY is not set');
  }

  pineconeInstance = new Pinecone({
    apiKey,
  });

  return pineconeInstance;
};

// Get the index for resources
export const getResourcesIndex = () => {
  const client = getPineconeClient();
  const indexName = process.env.PINECONE_INDEX_NAME || 'uni-resources';
  return client.index(indexName);
};

// Namespace for resources
export const RESOURCES_NAMESPACE = 'resources';

// Verify connection
export const verifyPineconeConnection = async (): Promise<boolean> => {
  try {
    const client = getPineconeClient();
    const indexes = await client.listIndexes();
    logger.info('Pinecone connection verified', { indexes: indexes.indexes?.length });
    return true;
  } catch (error) {
    logger.error('Pinecone connection failed:', error);
    return false;
  }
};

export { getPineconeClient as pinecone };

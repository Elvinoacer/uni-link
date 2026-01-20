import { Redis } from '@upstash/redis';
import { logger } from '../utils/logger';

// Default to empty strings to avoid crashes during build/dev without env vars
const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL || '';
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || '';

export const redis = new Redis({
  url: UPSTASH_REDIS_REST_URL,
  token: UPSTASH_REDIS_REST_TOKEN,
});

// Upstash Redis client is HTTP-based and stateless, so "connect" events don't exist in the same way.
// We can verify connection by doing a simple ping or just assume it works if creds are right.
logger.info('Redis client initialized with Upstash REST');


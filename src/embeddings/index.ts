import { config } from '../config';
import { LocalEmbeddingProvider } from './local-embedding-provider';
import type { EmbeddingProvider } from './types';

export function createEmbeddingProvider(): EmbeddingProvider {
  return new LocalEmbeddingProvider(config.embeddingDimensions);
}

export type { EmbeddingProvider } from './types';

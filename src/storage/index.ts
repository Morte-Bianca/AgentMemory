import { config } from '../config';
import { FileStore } from './file-store';
import { PostgresStore } from './postgres-store';
import type { StoreAdapter } from './types';

export function createStore(): StoreAdapter {
  if (config.storageDriver === 'postgres') {
    if (!config.databaseUrl) {
      throw new Error('DATABASE_URL is required when STORAGE_DRIVER=postgres');
    }
    return new PostgresStore(config.databaseUrl);
  }

  return new FileStore(config.dataFilePath);
}

export type { StoreAdapter } from './types';

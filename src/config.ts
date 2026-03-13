import path from 'node:path';

function splitCsv(value?: string): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export const config = {
  port: Number(process.env.PORT || 3000),
  host: process.env.HOST || '0.0.0.0',
  storageDriver: (process.env.STORAGE_DRIVER || 'file') as 'file' | 'postgres',
  databaseUrl: process.env.DATABASE_URL || '',
  embeddingDimensions: Number(process.env.EMBEDDING_DIMENSIONS || 128),
  dreamProvider: (process.env.DREAM_PROVIDER || 'local') as 'local',
  dataFilePath: process.env.DATA_FILE_PATH || path.join(process.cwd(), 'data', 'store.json'),
  defaultDreamIntervalMs: Number(process.env.DEFAULT_DREAM_INTERVAL_MS || 1000 * 60 * 15),
  mcpSessionEventLimit: Number(process.env.MCP_SESSION_EVENT_LIMIT || 100),
  mcpSessionTtlMs: Number(process.env.MCP_SESSION_TTL_MS || 1000 * 60 * 60 * 24),
  mcpAllowedOrigins: splitCsv(process.env.MCP_ALLOWED_ORIGINS),
};

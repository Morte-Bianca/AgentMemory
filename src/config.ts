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

function readBool(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) {
    return defaultValue;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === 'true' || normalized === '1' || normalized === 'yes') {
    return true;
  }
  if (normalized === 'false' || normalized === '0' || normalized === 'no') {
    return false;
  }

  return defaultValue;
}

function resolveDataFilePath(): string {
  const envPath = process.env.DATA_FILE_PATH;

  if (envPath) {
    if (process.env.VERCEL && !path.isAbsolute(envPath)) {
      return path.posix.join('/tmp', envPath.replace(/^\.\/+/, ''));
    }
    return envPath;
  }

  if (process.env.VERCEL) {
    return '/tmp/store.json';
  }

  return path.join(process.cwd(), 'data', 'store.json');
}

export const config = {
  port: Number(process.env.PORT || 3000),
  host: process.env.HOST || '0.0.0.0',
  testMode: readBool(process.env.TEST_MODE, false),
  storageDriver: (process.env.STORAGE_DRIVER || 'file') as 'file' | 'postgres',
  databaseUrl:
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    '',
  embeddingDimensions: Number(process.env.EMBEDDING_DIMENSIONS || 128),
  dreamProvider: (process.env.DREAM_PROVIDER || 'local') as 'local',
  dataFilePath: resolveDataFilePath(),
  defaultDreamIntervalMs: Number(process.env.DEFAULT_DREAM_INTERVAL_MS || 1000 * 60 * 15),
  mcpSessionEventLimit: Number(process.env.MCP_SESSION_EVENT_LIMIT || 100),
  mcpSessionTtlMs: Number(process.env.MCP_SESSION_TTL_MS || 1000 * 60 * 60 * 24),
  mcpAllowedOrigins: splitCsv(process.env.MCP_ALLOWED_ORIGINS),
};

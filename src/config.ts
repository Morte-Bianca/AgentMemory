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
  allowOpenAgentCreate: readBool(process.env.ALLOW_OPEN_AGENT_CREATE, false),
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
  googleClientIds: splitCsv(process.env.GOOGLE_CLIENT_IDS || process.env.GOOGLE_CLIENT_ID),
  authSessionSecret: process.env.AUTH_SESSION_SECRET || '',

  memoryCommitments: {
    enabled: readBool(process.env.MEMORY_COMMITMENTS_ENABLED, false),
    storageProvider: (process.env.MEMORY_COMMITMENTS_STORAGE_PROVIDER || 'pinata') as 'pinata',
    encryptionKeyBase64: process.env.MEMORY_ENCRYPTION_KEY_BASE64 || '',

    pinata: {
      jwt: process.env.PINATA_JWT || '',
      apiKey: process.env.PINATA_API_KEY || '',
      apiSecret: process.env.PINATA_API_SECRET || '',
      pinNamePrefix: process.env.PINATA_PIN_NAME_PREFIX || 'agentmemory',
      pinGroupId: process.env.PINATA_PIN_GROUP_ID || '',
    },

    ipfsGatewayBaseUrl: process.env.IPFS_GATEWAY_BASE_URL || 'https://gateway.pinata.cloud/ipfs/',

    evm: {
      enabled: readBool(process.env.MEMORY_COMMITMENTS_EVM_ENABLED, false),
      rpcUrl: process.env.EVM_RPC_URL || '',
      chainId: process.env.EVM_CHAIN_ID ? Number(process.env.EVM_CHAIN_ID) : undefined,
      privateKey: process.env.EVM_PRIVATE_KEY || '',
      contractAddress: process.env.EVM_CONTRACT_ADDRESS || '',
      toAddress: process.env.EVM_TO_ADDRESS || '',
    },

    solana: {
      enabled: readBool(process.env.MEMORY_COMMITMENTS_SOLANA_ENABLED, false),
      rpcUrl: process.env.SOLANA_RPC_URL || '',
      programId: process.env.SOLANA_PROGRAM_ID || '',
      secretKey: process.env.SOLANA_SECRET_KEY || '',
    },
  },
};

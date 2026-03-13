import { createHash, randomBytes } from 'node:crypto';

export function generateApiKey(): string {
  return `claw_${randomBytes(18).toString('hex')}`;
}

export function hashApiKey(apiKey: string): string {
  return createHash('sha256').update(apiKey).digest('hex');
}

export function apiKeyPrefix(apiKey: string): string {
  return apiKey.slice(0, 12);
}

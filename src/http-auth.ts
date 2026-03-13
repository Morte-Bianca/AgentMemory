import type { FastifyReply, FastifyRequest } from 'fastify';
import type { AgentRecord } from './types';
import type { AppServices } from './app';
import { config } from './config';

function readApiKey(request: FastifyRequest): string | null {
  const header = request.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    return header.slice(7).trim();
  }

  const apiKeyHeader = request.headers['x-api-key'];
  if (typeof apiKeyHeader === 'string' && apiKeyHeader.trim()) {
    return apiKeyHeader.trim();
  }

  return null;
}

export async function requireAgentAuth(
  request: FastifyRequest,
  reply: FastifyReply,
  services: AppServices,
): Promise<AgentRecord | null> {
  const apiKey = readApiKey(request);

  if (!apiKey && !config.requireApiKey) {
    return services.agents.getOrCreatePublicAgent({ name: config.publicAgentName });
  }

  if (!apiKey) {
    await reply.status(401).send({ error: 'Missing API key' });
    return null;
  }

  const agent = await services.agents.authenticate(apiKey);
  if (!agent) {
    if (!config.requireApiKey) {
      return services.agents.getOrCreatePublicAgent({ name: config.publicAgentName });
    }

    await reply.status(401).send({ error: 'Invalid API key' });
    return null;
  }

  return agent;
}

export async function ensureAgentScope(
  reply: FastifyReply,
  authAgent: AgentRecord,
  targetAgentId?: string,
): Promise<boolean> {
  if (!targetAgentId || authAgent.id === targetAgentId) {
    return true;
  }

  if (!config.requireApiKey && authAgent.name === config.publicAgentName) {
    await reply.status(403).send({ error: 'Anonymous access cannot target other agents' });
    return false;
  }

  await reply.status(403).send({ error: 'Agent scope mismatch' });
  return false;
}

export function toPublicAgent(agent: AgentRecord) {
  return {
    id: agent.id,
    name: agent.name,
    description: agent.description,
    apiKeyPrefix: agent.apiKeyPrefix,
    apiKeyStatus: agent.apiKeyStatus,
    apiKeyRotatedAt: agent.apiKeyRotatedAt,
    apiKeyRevokedAt: agent.apiKeyRevokedAt,
    createdAt: agent.createdAt,
    updatedAt: agent.updatedAt,
  };
}

import type { FastifyReply, FastifyRequest } from 'fastify';
import type { AgentRecord, UserRecord } from './types';
import type { AppServices } from './fastify-app';
import { config } from './config';
import { verifyUserSession } from './auth-session';

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

function readUserSessionToken(request: FastifyRequest): string | null {
  const header = request.headers['x-user-session'];
  if (typeof header === 'string' && header.trim()) {
    return header.trim();
  }
  return null;
}

export async function requireUserSession(
  request: FastifyRequest,
  reply: FastifyReply,
  services: AppServices,
): Promise<UserRecord | null> {
  const token = readUserSessionToken(request);
  if (!token) {
    await reply.status(401).send({ error: 'Missing user session' });
    return null;
  }

  if (!config.authSessionSecret) {
    await reply.status(500).send({ error: 'AUTH_SESSION_SECRET is not configured' });
    return null;
  }

  const session = verifyUserSession(token, config.authSessionSecret);
  if (!session) {
    await reply.status(401).send({ error: 'Invalid user session' });
    return null;
  }

  const user = await services.users.getById(session.userId);
  if (!user) {
    await reply.status(401).send({ error: 'User not found' });
    return null;
  }

  return user;
}

export async function requireAgentAuth(
  request: FastifyRequest,
  reply: FastifyReply,
  services: AppServices,
): Promise<AgentRecord | null> {
  const apiKey = readApiKey(request);

  if (!apiKey && config.testMode) {
    return services.agents.getOrCreatePublicAgent();
  }

  if (!apiKey) {
    await reply.status(401).send({ error: 'Missing API key' });
    return null;
  }

  const agent = await services.agents.authenticate(apiKey);
  if (!agent) {
    if (config.testMode) {
      return services.agents.getOrCreatePublicAgent();
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

  if (config.testMode && authAgent.name === '__public__') {
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

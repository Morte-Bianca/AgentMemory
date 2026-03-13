import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { AppServices } from '../fastify-app';
import { ensureAgentScope, requireAgentAuth } from '../http-auth';

const storeMemorySchema = z.object({
  agentId: z.string().min(1),
  sessionId: z.string().optional(),
  type: z.enum(['episodic', 'semantic', 'procedural', 'self_model', 'introspective']),
  content: z.string().min(1),
  summary: z.string().optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  importance: z.number().min(0).max(1).optional(),
  source: z.string().optional(),
});

const recallSchema = z.object({
  agentId: z.string().min(1),
  query: z.string().optional(),
  tags: z.array(z.string()).optional(),
  memoryTypes: z.array(z.enum(['episodic', 'semantic', 'procedural', 'self_model', 'introspective'])).optional(),
  metadataFilters: z.object({
    actor: z.enum(['user', 'assistant', 'tool', 'system']).optional(),
    intent: z.string().optional(),
    action: z.string().optional(),
    toolName: z.string().optional(),
    outcome: z.enum(['success', 'failure', 'partial']).optional(),
    workspaceId: z.string().optional(),
    threadId: z.string().optional(),
    userId: z.string().optional(),
  }).optional(),
  limit: z.number().int().positive().max(50).optional(),
});

export async function registerMemoryRoutes(app: FastifyInstance, services: AppServices) {
  app.post('/v1/memories', async (request, reply) => {
    const authAgent = await requireAgentAuth(request, reply, services);
    if (!authAgent) {
      return;
    }

    const parsed = storeMemorySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    if (!(await ensureAgentScope(reply, authAgent, parsed.data.agentId))) {
      return;
    }

    const agent = await services.agents.get(parsed.data.agentId);
    if (!agent) {
      return reply.status(404).send({ error: 'Agent not found' });
    }

    const memory = await services.memories.storeMemory(parsed.data);
    return reply.status(201).send({ memory });
  });

  app.post('/v1/memories/recall', async (request, reply) => {
    const authAgent = await requireAgentAuth(request, reply, services);
    if (!authAgent) {
      return;
    }

    const parsed = recallSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    if (!(await ensureAgentScope(reply, authAgent, parsed.data.agentId))) {
      return;
    }

    const memories = await services.memories.recall(parsed.data);
    return { memories, count: memories.length };
  });

  app.get('/v1/agents/:agentId/memories', async (request, reply) => {
    const authAgent = await requireAgentAuth(request, reply, services);
    if (!authAgent) {
      return;
    }

    const params = z.object({ agentId: z.string().min(1) }).safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send({ error: params.error.flatten() });
    }

    if (!(await ensureAgentScope(reply, authAgent, params.data.agentId))) {
      return;
    }

    return { memories: await services.memories.listByAgent(params.data.agentId) };
  });

  app.get('/v1/agents/:agentId/memories/stats', async (request, reply) => {
    const authAgent = await requireAgentAuth(request, reply, services);
    if (!authAgent) {
      return;
    }

    const params = z.object({ agentId: z.string().min(1) }).safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send({ error: params.error.flatten() });
    }

    if (!(await ensureAgentScope(reply, authAgent, params.data.agentId))) {
      return;
    }

    return { stats: await services.memories.stats(params.data.agentId) };
  });
}

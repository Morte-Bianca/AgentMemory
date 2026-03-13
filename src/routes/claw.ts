import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { AppServices } from '../fastify-app';
import { ensureAgentScope, requireAgentAuth } from '../http-auth';

const clawEventSchema = z.object({
  agentId: z.string().min(1).optional(),
  session: z.object({
    id: z.string().min(1).optional(),
    channel: z.string().min(1),
    workspaceId: z.string().optional(),
    threadId: z.string().optional(),
    userId: z.string().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  }).optional(),
  event: z.object({
    kind: z.enum([
      'user_message',
      'assistant_response',
      'tool_result',
      'reflection',
      'knowledge_note',
      'policy_update',
    ]),
    actor: z.enum(['user', 'assistant', 'tool', 'system']).optional(),
    content: z.string().min(1),
    summary: z.string().optional(),
    intent: z.string().optional(),
    action: z.string().optional(),
    toolName: z.string().optional(),
    outcome: z.enum(['success', 'failure', 'partial']).optional(),
    references: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
    importance: z.number().min(0).max(1).optional(),
    source: z.string().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  }),
  triggerDream: z.boolean().optional(),
});

const clawContextSchema = z.object({
  agentId: z.string().min(1).optional(),
  query: z.string().optional(),
  tags: z.array(z.string()).optional(),
  limit: z.number().int().positive().max(20).optional(),
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
});

export async function registerClawRoutes(app: FastifyInstance, services: AppServices) {
  app.post('/v1/claw/events', async (request, reply) => {
    const authAgent = await requireAgentAuth(request, reply, services);
    if (!authAgent) {
      return;
    }

    const parsed = clawEventSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    if (!(await ensureAgentScope(reply, authAgent, parsed.data.agentId))) {
      return;
    }

    const result = await services.claw.ingestEvent(authAgent.id, parsed.data);
    return reply.status(201).send(result);
  });

  app.post('/v1/claw/context', async (request, reply) => {
    const authAgent = await requireAgentAuth(request, reply, services);
    if (!authAgent) {
      return;
    }

    const parsed = clawContextSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    if (!(await ensureAgentScope(reply, authAgent, parsed.data.agentId))) {
      return;
    }

    const context = await services.claw.buildContext({
      agentId: authAgent.id,
      query: parsed.data.query,
      tags: parsed.data.tags,
      limit: parsed.data.limit,
      memoryTypes: parsed.data.memoryTypes,
      metadataFilters: parsed.data.metadataFilters,
    });

    return { context };
  });
}

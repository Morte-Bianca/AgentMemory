import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { AppServices } from '../fastify-app';
import { ensureAgentScope, requireAgentAuth } from '../http-auth';

export async function registerCommitmentRoutes(app: FastifyInstance, services: AppServices) {
  app.post('/v1/agents/:agentId/commitments/backfill', async (request, reply) => {
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

    const body = z
      .object({
        limit: z.coerce.number().int().positive().max(5).optional(),
        includeFailed: z.boolean().optional(),
        verify: z.boolean().optional(),
        cursor: z
          .object({
            createdAt: z.string().min(1),
            id: z.string().min(1),
          })
          .optional(),
      })
      .safeParse(request.body ?? {});

    if (!body.success) {
      return reply.status(400).send({ error: body.error.flatten() });
    }

    const result = await services.commitments.backfillAgent(params.data.agentId, {
      limit: body.data.limit,
      includeFailed: body.data.includeFailed,
      verify: body.data.verify,
      cursor: body.data.cursor,
    });

    return reply.status(200).send({ result });
  });

  app.get('/v1/agents/:agentId/commitments', async (request, reply) => {
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

    const query = z.object({ limit: z.coerce.number().int().positive().max(500).optional() }).safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send({ error: query.error.flatten() });
    }

    const commitments = await services.commitments.listByAgent(params.data.agentId, { limit: query.data.limit });
    return { commitments };
  });

  app.get('/v1/agents/:agentId/memories/:memoryId/commitment', async (request, reply) => {
    const authAgent = await requireAgentAuth(request, reply, services);
    if (!authAgent) {
      return;
    }

    const params = z.object({ agentId: z.string().min(1), memoryId: z.string().min(1) }).safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send({ error: params.error.flatten() });
    }

    if (!(await ensureAgentScope(reply, authAgent, params.data.agentId))) {
      return;
    }

    const commitment = await services.commitments.get(params.data.memoryId);
    if (!commitment || commitment.agentId !== params.data.agentId) {
      return reply.status(404).send({ error: 'Commitment not found' });
    }

    return { commitment };
  });

  app.get('/v1/agents/:agentId/memories/:memoryId/commitment/verify', async (request, reply) => {
    const authAgent = await requireAgentAuth(request, reply, services);
    if (!authAgent) {
      return;
    }

    const params = z.object({ agentId: z.string().min(1), memoryId: z.string().min(1) }).safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send({ error: params.error.flatten() });
    }

    if (!(await ensureAgentScope(reply, authAgent, params.data.agentId))) {
      return;
    }

    try {
      const verification = await services.commitments.verify(params.data.agentId, params.data.memoryId);
      return { verification };
    } catch {
      return reply.status(404).send({ error: 'Commitment not found' });
    }
  });
}

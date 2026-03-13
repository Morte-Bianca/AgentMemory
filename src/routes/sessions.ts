import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { AppServices } from '../app';
import { ensureAgentScope, requireAgentAuth } from '../http-auth';

const createSessionSchema = z.object({
  agentId: z.string().min(1),
  channel: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function registerSessionRoutes(app: FastifyInstance, services: AppServices) {
  app.post('/v1/sessions', async (request, reply) => {
    const authAgent = await requireAgentAuth(request, reply, services);
    if (!authAgent) {
      return;
    }

    const parsed = createSessionSchema.safeParse(request.body);
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

    const session = await services.sessions.create(parsed.data);
    return reply.status(201).send({ session });
  });

  app.get('/v1/agents/:agentId/sessions', async (request, reply) => {
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

    return { sessions: await services.sessions.listByAgent(params.data.agentId) };
  });
}

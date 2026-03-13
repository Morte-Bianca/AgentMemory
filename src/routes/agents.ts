import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { AppServices } from '../app';
import { requireAgentAuth, toPublicAgent } from '../http-auth';

const createAgentSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
});

export async function registerAgentRoutes(app: FastifyInstance, services: AppServices) {
  app.get('/v1/agents', async (request, reply) => {
    const authAgent = await requireAgentAuth(request, reply, services);
    if (!authAgent) {
      return;
    }

    return { agents: [toPublicAgent(authAgent)] };
  });

  app.get('/v1/agents/me', async (request, reply) => {
    const authAgent = await requireAgentAuth(request, reply, services);
    if (!authAgent) {
      return;
    }

    return { agent: toPublicAgent(authAgent) };
  });

  app.post('/v1/agents', async (request, reply) => {
    const parsed = createAgentSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    const { agent, apiKey } = await services.agents.create(parsed.data);
    return reply.status(201).send({ agent: toPublicAgent(agent), apiKey });
  });

  app.post('/v1/agents/me/api-key/rotate', async (request, reply) => {
    const authAgent = await requireAgentAuth(request, reply, services);
    if (!authAgent) {
      return;
    }

    const { agent, apiKey } = await services.agents.rotateApiKey(authAgent.id);
    return reply.status(201).send({ agent: toPublicAgent(agent), apiKey });
  });

  app.post('/v1/agents/me/api-key/revoke', async (request, reply) => {
    const authAgent = await requireAgentAuth(request, reply, services);
    if (!authAgent) {
      return;
    }

    const agent = await services.agents.revokeApiKey(authAgent.id);
    return reply.status(200).send({ agent: toPublicAgent(agent) });
  });
}

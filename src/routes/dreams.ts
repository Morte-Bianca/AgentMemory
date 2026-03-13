import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { config } from '../config';
import type { AppServices } from '../app';
import { ensureAgentScope, requireAgentAuth } from '../http-auth';

const runDreamSchema = z.object({
  agentId: z.string().min(1),
  maxSourceMemories: z.number().int().positive().max(100).optional(),
});

const scheduleSchema = z.object({
  agentId: z.string().min(1),
  intervalMs: z.number().int().positive().optional(),
});

export async function registerDreamRoutes(app: FastifyInstance, services: AppServices) {
  app.post('/v1/dreams/run', async (request, reply) => {
    const authAgent = await requireAgentAuth(request, reply, services);
    if (!authAgent) {
      return;
    }

    const parsed = runDreamSchema.safeParse(request.body);
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

    const result = await services.dreams.run(parsed.data.agentId, {
      maxSourceMemories: parsed.data.maxSourceMemories,
    });

    return reply.status(201).send(result);
  });

  app.get('/v1/agents/:agentId/dreams', async (request, reply) => {
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

    return { dreamRuns: await services.dreams.list(params.data.agentId) };
  });

  app.post('/v1/dreams/schedule/start', async (request, reply) => {
    const authAgent = await requireAgentAuth(request, reply, services);
    if (!authAgent) {
      return;
    }

    const parsed = scheduleSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    if (!(await ensureAgentScope(reply, authAgent, parsed.data.agentId))) {
      return;
    }

    const schedule = services.dreamScheduler.start(
      parsed.data.agentId,
      parsed.data.intervalMs ?? config.defaultDreamIntervalMs,
    );

    return reply.status(201).send({ schedule });
  });

  app.post('/v1/dreams/schedule/stop', async (request, reply) => {
    const authAgent = await requireAgentAuth(request, reply, services);
    if (!authAgent) {
      return;
    }

    const parsed = z.object({ agentId: z.string().min(1) }).safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    if (!(await ensureAgentScope(reply, authAgent, parsed.data.agentId))) {
      return;
    }

    const schedule = services.dreamScheduler.stop(parsed.data.agentId);
    if (!schedule) {
      return reply.status(404).send({ error: 'Schedule not found' });
    }

    return { schedule };
  });

  app.get('/v1/dreams/schedule', async (request, reply) => {
    const authAgent = await requireAgentAuth(request, reply, services);
    if (!authAgent) {
      return;
    }

    return {
      schedules: services.dreamScheduler.list().filter((schedule) => schedule.agentId === authAgent.id),
    };
  });
}

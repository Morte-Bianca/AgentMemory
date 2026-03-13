import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { AppServices } from '../fastify-app';
import { config } from '../config';
import { verifyGoogleCredential } from '../google-auth';
import { signUserSession } from '../auth-session';
import { requireUserSession, toPublicAgent } from '../http-auth';

const googleAuthSchema = z.object({
  credential: z.string().min(1),
});

export async function registerAuthRoutes(app: FastifyInstance, services: AppServices) {
  app.post('/v1/auth/google', async (request, reply) => {
    const parsed = googleAuthSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    if (config.googleClientIds.length === 0) {
      return reply.status(500).send({ error: 'GOOGLE_CLIENT_ID is not configured' });
    }

    if (!config.authSessionSecret) {
      return reply.status(500).send({ error: 'AUTH_SESSION_SECRET is not configured' });
    }

    const profile = await verifyGoogleCredential({
      credential: parsed.data.credential,
      clientIds: config.googleClientIds,
    });

    const user = await services.users.upsertGoogleUser(profile);
    const token = signUserSession({
      userId: user.id,
      email: user.email,
      secret: config.authSessionSecret,
    });
    const agent = await services.agents.getByOwnerUserId(user.id);

    return reply.status(200).send({
      user,
      sessionToken: token,
      agent: agent ? toPublicAgent(agent) : null,
    });
  });

  app.get('/v1/auth/me', async (request, reply) => {
    const user = await requireUserSession(request, reply, services);
    if (!user) {
      return;
    }

    const agent = await services.agents.getByOwnerUserId(user.id);
    return { user, agent: agent ? toPublicAgent(agent) : null };
  });
}

import Fastify from 'fastify';
import cors from '@fastify/cors';
import type { StoreAdapter } from './storage';
import { createDreamProvider } from './dreams';
import { createEmbeddingProvider } from './embeddings';
import { createStore } from './storage';
import { AgentService } from './services/agent-service';
import { SessionService } from './services/session-service';
import { MemoryService } from './services/memory-service';
import { DreamService } from './services/dream-service';
import { DreamScheduler } from './services/dream-scheduler';
import { ClawService } from './services/claw-service';
import { registerHealthRoutes } from './routes/health';
import { registerAgentRoutes } from './routes/agents';
import { registerSessionRoutes } from './routes/sessions';
import { registerMemoryRoutes } from './routes/memories';
import { registerDreamRoutes } from './routes/dreams';
import { registerClawRoutes } from './routes/claw';
import { registerMcpRoutes } from './routes/mcp';

export interface AppServices {
  store: StoreAdapter;
  agents: AgentService;
  sessions: SessionService;
  memories: MemoryService;
  dreams: DreamService;
  dreamScheduler: DreamScheduler;
  claw: ClawService;
}

export async function buildApp() {
  const app = Fastify({ logger: false });
  await app.register(cors, { origin: true });

  const store = createStore();
  await store.init?.();
  const embeddingProvider = createEmbeddingProvider();
  const dreamProvider = createDreamProvider();
  const agents = new AgentService(store);
  const sessions = new SessionService(store);
  const memories = new MemoryService(store, embeddingProvider);
  const dreams = new DreamService(store, memories, dreamProvider);
  const dreamScheduler = new DreamScheduler(dreams);
  const claw = new ClawService(sessions, memories, dreams);

  const services: AppServices = {
    store,
    agents,
    sessions,
    memories,
    dreams,
    dreamScheduler,
    claw,
  };

  await registerHealthRoutes(app);
  await registerAgentRoutes(app, services);
  await registerSessionRoutes(app, services);
  await registerMemoryRoutes(app, services);
  await registerDreamRoutes(app, services);
  await registerClawRoutes(app, services);
  await registerMcpRoutes(app, services);

  app.addHook('onClose', async () => {
    await store.close?.();
  });

  return app;
}

import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/fastify-app';

let appPromise: Promise<FastifyInstance> | null = null;

process.on('unhandledRejection', (reason) => {
  console.error('unhandledRejection', reason);
});

process.on('uncaughtException', (error) => {
  console.error('uncaughtException', error);
});

async function getApp(): Promise<FastifyInstance> {
  if (!appPromise) {
    appPromise = buildApp();
  }

  const app = await appPromise;
  await app.ready();
  return app;
}

export async function proxyToFastify(req: VercelRequest, res: VercelResponse, url: string) {
  try {
    req.url = url;

    const app = await getApp();
    await new Promise<void>((resolve, reject) => {
      const done = () => resolve();
      res.once('finish', done);
      res.once('close', done);
      res.once('error', reject);
      app.server.emit('request', req, res);
    });
  } catch (error) {
    console.error('Vercel function handler failed', error);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('content-type', 'application/json; charset=utf-8');
      res.end(
        JSON.stringify({
          error: 'internal_server_error',
          message: error instanceof Error ? error.message : 'Unknown error',
        }),
      );
      return;
    }

    try {
      res.end();
    } catch {
      // ignore
    }
  }
}
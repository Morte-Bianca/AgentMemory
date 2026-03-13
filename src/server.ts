import { buildApp } from './app';
import { config } from './config';

async function start() {
  const app = await buildApp();
  await app.listen({ port: config.port, host: config.host });
  console.log(`Claw memory API listening on http://${config.host}:${config.port}`);
}

void start();

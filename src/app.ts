// NOTE:
// This file intentionally only exports a default handler.
// Some Vercel routing/build configurations can misinterpret `src/app` as a Function entrypoint
// and reject named exports with: "Invalid export found in module '/var/task/src/app.js'".
//
// The Fastify app builder lives in `src/fastify-app.ts`.

// Vercel's Fastify framework detection expects an entrypoint file to import `fastify` directly.
// This import is intentionally unused at runtime.
import Fastify from 'fastify';
void Fastify;

export { default } from '../api/index';

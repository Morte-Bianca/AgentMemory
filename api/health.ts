import type { VercelRequest, VercelResponse } from '@vercel/node';
import { proxyToFastify } from './_shared';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const search = new URL(req.url || '/health', 'https://local.invalid').search;
  await proxyToFastify(req, res, `/health${search}`);
}
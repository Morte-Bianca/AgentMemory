import type { VercelRequest, VercelResponse } from '@vercel/node';
import { proxyToFastify } from './_shared';

function readPath(req: VercelRequest): string {
  const raw = req.query.path;

  if (Array.isArray(raw)) {
    return raw.map((item) => String(item)).filter(Boolean).join('/');
  }

  if (typeof raw === 'string') {
    return raw.replace(/^\/+/, '');
  }

  return '';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const parsed = new URL(req.url || '/api/v1', 'https://local.invalid');
  const path = readPath(req);
  const pathname = path ? `/v1/${path}` : '/v1';
  await proxyToFastify(req, res, `${pathname}${parsed.search}`);
}
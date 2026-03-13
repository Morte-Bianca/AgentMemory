import type { VercelRequest, VercelResponse } from '@vercel/node';
import { proxyToFastify } from '../_shared';

function readPathSegments(req: VercelRequest): string[] {
  const raw = req.query.path;

  if (Array.isArray(raw)) {
    return raw.map((item) => String(item));
  }

  if (typeof raw === 'string' && raw.length > 0) {
    return raw.split('/').filter(Boolean);
  }

  const pathname = new URL(req.url || '/api/v1', 'https://local.invalid').pathname;
  return pathname.replace(/^\/api\/v1\/?/, '').split('/').filter(Boolean);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const segments = readPathSegments(req);
  const parsed = new URL(req.url || '/api/v1', 'https://local.invalid');
  await proxyToFastify(req, res, `/v1/${segments.join('/')}${parsed.search}`);
}
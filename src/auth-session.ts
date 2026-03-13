import crypto from 'node:crypto';

interface SessionPayload {
  userId: string;
  email: string;
  exp: number;
}

function toBase64Url(value: string) {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function fromBase64Url(value: string) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

export function signUserSession(input: { userId: string; email: string; secret: string; expiresInSeconds?: number }) {
  const payload: SessionPayload = {
    userId: input.userId,
    email: input.email,
    exp: Math.floor(Date.now() / 1000) + (input.expiresInSeconds ?? 60 * 60 * 24 * 30),
  };

  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = crypto.createHmac('sha256', input.secret).update(encodedPayload).digest('base64url');
  return `${encodedPayload}.${signature}`;
}

export function verifyUserSession(token: string, secret: string): { userId: string; email: string } | null {
  const [encodedPayload, signature] = token.split('.');
  if (!encodedPayload || !signature) {
    return null;
  }

  const expected = crypto.createHmac('sha256', secret).update(encodedPayload).digest('base64url');
  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);
  if (expectedBuffer.length !== signatureBuffer.length || !crypto.timingSafeEqual(expectedBuffer, signatureBuffer)) {
    return null;
  }

  try {
    const payload = JSON.parse(fromBase64Url(encodedPayload)) as SessionPayload;
    if (!payload.userId || !payload.email || !payload.exp) {
      return null;
    }
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return { userId: payload.userId, email: payload.email };
  } catch {
    return null;
  }
}

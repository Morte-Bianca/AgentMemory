export interface GoogleProfile {
  googleSub: string;
  email: string;
  name: string;
  picture?: string;
}

export async function verifyGoogleCredential(input: { credential: string; clientIds: string[] }): Promise<GoogleProfile> {
  const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(input.credential)}`);
  if (!response.ok) {
    throw new Error('Failed to verify Google credential');
  }

  const payload = (await response.json()) as {
    sub?: string;
    email?: string;
    name?: string;
    picture?: string;
    aud?: string;
    email_verified?: string;
  };

  if (!payload?.sub || !payload.email || !payload.name) {
    throw new Error('Invalid Google credential');
  }

  if (!payload.aud || !input.clientIds.includes(payload.aud)) {
    throw new Error('Google credential audience mismatch');
  }

  if (payload.email_verified !== 'true') {
    throw new Error('Google email is not verified');
  }

  return {
    googleSub: payload.sub,
    email: payload.email,
    name: payload.name,
    picture: payload.picture ?? undefined,
  };
}

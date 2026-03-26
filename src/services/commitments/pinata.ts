import https from 'node:https';

export interface PinataConfig {
  jwt: string;
  apiKey: string;
  apiSecret: string;
  pinNamePrefix: string;
  pinGroupId: string;
}

export interface PinJsonResult {
  cid: string;
}

function httpsJson<T>(url: string, opts: { method: 'POST'; headers: Record<string, string>; body: unknown }): Promise<T> {
  return new Promise((resolve, reject) => {
    const endpoint = new URL(url);
    const payload = JSON.stringify(opts.body);

    const req = https.request(
      {
        protocol: endpoint.protocol,
        hostname: endpoint.hostname,
        path: endpoint.pathname + endpoint.search,
        method: opts.method,
        headers: {
          'content-type': 'application/json',
          'content-length': Buffer.byteLength(payload).toString(),
          ...opts.headers,
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
        res.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf8');
          const status = res.statusCode ?? 0;
          if (status < 200 || status >= 300) {
            return reject(new Error(`Pinata HTTP ${status}: ${raw.slice(0, 4000)}`));
          }

          try {
            resolve(JSON.parse(raw) as T);
          } catch (error) {
            reject(error);
          }
        });
      },
    );

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

export class PinataClient {
  constructor(private readonly cfg: PinataConfig) {}

  async pinJson(content: unknown, opts?: { name?: string }): Promise<PinJsonResult> {
    const jwt = this.cfg.jwt.trim();
    const apiKey = this.cfg.apiKey.trim();
    const apiSecret = this.cfg.apiSecret.trim();

    const headers: Record<string, string> = {};
    if (jwt) {
      headers.authorization = `Bearer ${jwt}`;
    } else if (apiKey && apiSecret) {
      headers.pinata_api_key = apiKey;
      headers.pinata_secret_api_key = apiSecret;
    } else {
      throw new Error('Pinata credentials missing: set PINATA_JWT or PINATA_API_KEY+PINATA_API_SECRET');
    }

    const name = opts?.name?.trim();
    const fullName = name ? `${this.cfg.pinNamePrefix || 'agentmemory'}:${name}` : undefined;

    const body: Record<string, unknown> = {
      pinataContent: content,
    };

    if (fullName || this.cfg.pinGroupId) {
      body.pinataMetadata = {
        ...(fullName ? { name: fullName } : {}),
        ...(this.cfg.pinGroupId ? { groupId: this.cfg.pinGroupId } : {}),
      };
    }

    const result = await httpsJson<{ IpfsHash?: string }>(
      'https://api.pinata.cloud/pinning/pinJSONToIPFS',
      { method: 'POST', headers, body },
    );

    if (!result.IpfsHash) {
      throw new Error('Pinata response missing IpfsHash');
    }

    return { cid: result.IpfsHash };
  }
}

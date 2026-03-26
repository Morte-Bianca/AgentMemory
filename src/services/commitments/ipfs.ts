import https from 'node:https';

export async function fetchJsonFromIpfsGateway<T>(input: { gatewayBaseUrl: string; cid: string }): Promise<T> {
  const base = input.gatewayBaseUrl.trim() || 'https://gateway.pinata.cloud/ipfs/';
  const url = new URL(input.cid, base.endsWith('/') ? base : `${base}/`);

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        path: url.pathname + url.search,
        method: 'GET',
        headers: { accept: 'application/json' },
      },
      (res) => {
        const status = res.statusCode ?? 0;
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
        res.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf8');
          if (status < 200 || status >= 300) {
            return reject(new Error(`IPFS gateway HTTP ${status}: ${raw.slice(0, 4000)}`));
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
    req.end();
  });
}

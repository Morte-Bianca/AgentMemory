import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

export function sha256Hex(data: string | Buffer): string {
  const hash = createHash('sha256');
  hash.update(data);
  return hash.digest('hex');
}

export interface EncryptedBlob {
  v: 1;
  alg: 'AES-256-GCM';
  ivB64: string;
  tagB64: string;
  ciphertextB64: string;
}

export function encryptUtf8Aes256Gcm(plaintextUtf8: string, keyBase64: string): {
  encrypted: EncryptedBlob;
  encryptedHashHex: string;
} {
  const key = Buffer.from(keyBase64, 'base64');
  if (key.length !== 32) {
    throw new Error('MEMORY_ENCRYPTION_KEY_BASE64 must be 32 bytes (base64-encoded)');
  }

  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(Buffer.from(plaintextUtf8, 'utf8')), cipher.final()]);
  const tag = cipher.getAuthTag();

  const encryptedHashHex = sha256Hex(Buffer.concat([iv, ciphertext, tag]));

  return {
    encrypted: {
      v: 1,
      alg: 'AES-256-GCM',
      ivB64: iv.toString('base64'),
      tagB64: tag.toString('base64'),
      ciphertextB64: ciphertext.toString('base64'),
    },
    encryptedHashHex,
  };
}

export function decryptUtf8Aes256Gcm(encrypted: EncryptedBlob, keyBase64: string): string {
  if (encrypted.v !== 1 || encrypted.alg !== 'AES-256-GCM') {
    throw new Error('Unsupported encrypted blob format');
  }

  const key = Buffer.from(keyBase64, 'base64');
  if (key.length !== 32) {
    throw new Error('MEMORY_ENCRYPTION_KEY_BASE64 must be 32 bytes (base64-encoded)');
  }

  const iv = Buffer.from(encrypted.ivB64, 'base64');
  const ciphertext = Buffer.from(encrypted.ciphertextB64, 'base64');
  const tag = Buffer.from(encrypted.tagB64, 'base64');

  if (iv.length !== 12) {
    throw new Error('Invalid IV length');
  }
  if (tag.length !== 16) {
    throw new Error('Invalid auth tag length');
  }

  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString('utf8');
}

import { createHash } from 'node:crypto';
import type { EmbeddingProvider } from './types';

function normalize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^\p{L}\p{N}_-]+/u)
    .map((token) => token.trim())
    .filter((token) => token.length > 1);
}

function hashToUnitInterval(input: string): number {
  const hex = createHash('sha256').update(input).digest('hex').slice(0, 8);
  const int = Number.parseInt(hex, 16);
  return (int / 0xffffffff) * 2 - 1;
}

export class LocalEmbeddingProvider implements EmbeddingProvider {
  readonly modelName = 'local-hash-128';

  constructor(public readonly dimensions: number) {}

  async embed(text: string): Promise<number[]> {
    const tokens = normalize(text);
    const vector = new Array<number>(this.dimensions).fill(0);

    if (tokens.length === 0) {
      return vector;
    }

    for (const token of tokens) {
      for (let i = 0; i < this.dimensions; i += 1) {
        vector[i] += hashToUnitInterval(`${token}:${i}`);
      }
    }

    const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
    if (magnitude === 0) {
      return vector;
    }

    return vector.map((value) => Number((value / magnitude).toFixed(6)));
  }
}

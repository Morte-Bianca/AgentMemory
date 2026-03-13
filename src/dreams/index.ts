import { config } from '../config';
import { LocalClawDreamProvider } from './local-claw-dream-provider';
import type { DreamSynthesisProvider } from './types';

export function createDreamProvider(): DreamSynthesisProvider {
  switch (config.dreamProvider) {
    case 'local':
    default:
      return new LocalClawDreamProvider();
  }
}

export type { DreamDraft, DreamSynthesisInput, DreamSynthesisOutput, DreamSynthesisProvider } from './types';

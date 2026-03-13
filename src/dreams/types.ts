import type { MemoryRecord, MemoryType } from '../types';

export interface DreamDraft {
  type: Exclude<MemoryType, 'episodic'>;
  summary: string;
  content: string;
  tags: string[];
  importance: number;
}

export interface DreamSynthesisInput {
  agentId: string;
  sourceMemories: MemoryRecord[];
}

export interface DreamSynthesisOutput {
  provider: string;
  notes: string[];
  drafts: DreamDraft[];
}

export interface DreamSynthesisProvider {
  readonly name: string;
  synthesize(input: DreamSynthesisInput): Promise<DreamSynthesisOutput>;
}

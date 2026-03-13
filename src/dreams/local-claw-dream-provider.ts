import type { MemoryRecord } from '../types';
import type { DreamDraft, DreamSynthesisInput, DreamSynthesisOutput, DreamSynthesisProvider } from './types';

function topTags(memories: MemoryRecord[]): string[] {
  const counts = new Map<string, number>();
  for (const memory of memories) {
    for (const tag of memory.tags) {
      counts.set(tag, (counts.get(tag) || 0) + 1);
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag]) => tag);
}

function averageImportance(memories: MemoryRecord[]): number {
  if (memories.length === 0) {
    return 0;
  }

  return memories.reduce((sum, memory) => sum + memory.importance, 0) / memories.length;
}

function topEvidence(memories: MemoryRecord[]): string[] {
  return memories
    .slice(0, 4)
    .map((memory) => memory.summary)
    .filter(Boolean);
}

function buildSemanticDraft(tags: string[], evidence: string[], avgImportance: number): DreamDraft {
  return {
    type: 'semantic',
    summary: tags.length > 0
      ? `Dream synthesis around ${tags.join(', ')}`
      : 'Dream synthesis from recent Claw sessions',
    content: tags.length > 0
      ? `Across recent Claw sessions, recurring themes formed around ${tags.join(', ')}. Strong evidence includes: ${evidence.join('; ')}.`
      : `Recent Claw sessions reveal a recurring pattern. Strong evidence includes: ${evidence.join('; ')}.`,
    tags,
    importance: Math.min(0.95, avgImportance + 0.08),
  };
}

function buildProceduralDraft(tags: string[], evidence: string[], avgImportance: number): DreamDraft {
  const lead = tags[0] || 'high-signal tasks';
  return {
    type: 'procedural',
    summary: `Procedure candidate for ${lead}`,
    content: `When Claw sessions involve ${lead}, first recall the most recent episodic context, then combine it with stable semantic memory, and finish with explicit next actions. Evidence: ${evidence.slice(0, 2).join('; ')}.`,
    tags,
    importance: Math.min(0.92, avgImportance + 0.04),
  };
}

function buildSelfModelDraft(tags: string[], evidence: string[], avgImportance: number): DreamDraft {
  return {
    type: 'self_model',
    summary: 'Self-model reflection after dream cycle',
    content: tags.length > 0
      ? `The agent is consolidating an identity around ${tags.join(', ')}. It should remain Claw-scoped, preserve session continuity, and reuse proven context patterns grounded in: ${evidence.slice(0, 3).join('; ')}.`
      : `The agent should remain Claw-scoped, preserve session continuity, and reuse proven context patterns grounded in recent high-signal memories.`,
    tags: ['dream', 'identity', ...tags],
    importance: Math.min(0.97, avgImportance + 0.1),
  };
}

export class LocalClawDreamProvider implements DreamSynthesisProvider {
  readonly name = 'local-claw-dream-v1';

  async synthesize(input: DreamSynthesisInput): Promise<DreamSynthesisOutput> {
    const tags = topTags(input.sourceMemories);
    const avgImportance = averageImportance(input.sourceMemories);
    const evidence = topEvidence(input.sourceMemories);

    const drafts: DreamDraft[] = [
      buildSemanticDraft(tags, evidence, avgImportance),
      buildProceduralDraft(tags, evidence, avgImportance),
      buildSelfModelDraft(tags, evidence, avgImportance),
    ];

    return {
      provider: this.name,
      notes: [
        `Provider ${this.name} synthesized ${drafts.length} dream drafts.`,
        `Dominant tags: ${tags.length > 0 ? tags.join(', ') : 'none'}.`,
        `Evidence count: ${evidence.length}.`,
      ],
      drafts,
    };
  }
}

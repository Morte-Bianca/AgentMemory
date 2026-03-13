import type { StoreAdapter } from '../storage';
import type { DreamSynthesisProvider } from '../dreams';
import type { DreamRunRecord, MemoryRecord } from '../types';
import { createId } from './id';
import { MemoryService } from './memory-service';

export class DreamService {
  constructor(
    private readonly store: StoreAdapter,
    private readonly memoryService: MemoryService,
    private readonly provider: DreamSynthesisProvider,
  ) {}

  async run(agentId: string, opts?: { maxSourceMemories?: number }): Promise<{
    dreamRun: DreamRunRecord;
    createdMemories: MemoryRecord[];
  }> {
    const allMemories = await this.memoryService.listByAgent(agentId);
    const sourceMemories = allMemories
      .filter((memory) => memory.type === 'episodic' || memory.type === 'introspective')
      .sort((a, b) => (b.importance - a.importance) || b.createdAt.localeCompare(a.createdAt))
      .slice(0, opts?.maxSourceMemories ?? 12);

    const notes: string[] = [];
    const createdMemories: MemoryRecord[] = [];
    const dreamRunId = createId('drm');

    if (sourceMemories.length === 0) {
      notes.push('No episodic/introspective memories found for dream processing.');
    } else {
      const synthesis = await this.provider.synthesize({
        agentId,
        sourceMemories,
      });

      for (const draft of synthesis.drafts) {
        const createdMemory = await this.memoryService.storeMemory({
          agentId,
          type: draft.type,
          source: 'dream-cycle',
          tags: draft.tags,
          importance: draft.importance,
          summary: draft.summary,
          content: draft.content,
          dreamOriginRunId: dreamRunId,
        });
        createdMemories.push(createdMemory);
        notes.push(`Created ${draft.type} dream memory.`);
      }

      notes.push(...synthesis.notes);
    }

    const dreamRun: DreamRunRecord = {
      id: dreamRunId,
      agentId,
      status: 'completed',
      provider: this.provider.name,
      notes,
      sourceMemoryIds: sourceMemories.map((memory) => memory.id),
      createdMemoryIds: createdMemories.map((memory) => memory.id),
      createdAt: new Date().toISOString(),
    };

    const state = await this.store.read();
    state.dreamRuns.push(dreamRun);
    await this.store.write(state);

    return { dreamRun, createdMemories };
  }

  async list(agentId: string): Promise<DreamRunRecord[]> {
    const state = await this.store.read();
    return state.dreamRuns
      .filter((dreamRun) => dreamRun.agentId === agentId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}

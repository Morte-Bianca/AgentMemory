import type { ClawEventInput, MemoryType, RecallMetadataFilters } from '../types';
import type { SessionService } from './session-service';
import type { MemoryService } from './memory-service';
import type { DreamService } from './dream-service';

function kindToMemoryType(event: ClawEventInput['event']): MemoryType {
  switch (event.kind) {
    case 'reflection':
      return 'introspective';
    case 'knowledge_note':
      return 'semantic';
    case 'policy_update':
      return 'procedural';
    case 'tool_result':
      return event.outcome === 'success' ? 'procedural' : 'episodic';
    default:
      return 'episodic';
  }
}

function deriveTags(input: ClawEventInput, channel?: string): string[] {
  const tags = new Set<string>();
  tags.add(input.event.kind.replace(/_/g, '-'));

  if (channel) tags.add(channel.toLowerCase());
  if (input.event.actor) tags.add(`actor:${input.event.actor}`);
  if (input.event.intent) tags.add(`intent:${input.event.intent.toLowerCase()}`);
  if (input.event.action) tags.add(`action:${input.event.action.toLowerCase()}`);
  if (input.event.toolName) tags.add(`tool:${input.event.toolName.toLowerCase()}`);
  if (input.event.outcome) tags.add(`outcome:${input.event.outcome}`);

  for (const tag of input.event.tags ?? []) {
    if (tag.trim()) tags.add(tag.trim().toLowerCase());
  }

  return [...tags];
}

function buildMetadata(input: ClawEventInput, sessionId?: string): Record<string, unknown> {
  return {
    sessionExternalId: input.session?.id,
    sessionId,
    channel: input.session?.channel,
    workspaceId: input.session?.workspaceId,
    threadId: input.session?.threadId,
    userId: input.session?.userId,
    actor: input.event.actor,
    intent: input.event.intent,
    action: input.event.action,
    toolName: input.event.toolName,
    outcome: input.event.outcome,
    references: input.event.references ?? [],
    ...(input.session?.metadata ?? {}),
    ...(input.event.metadata ?? {}),
  };
}

function shouldAutoDream(input: ClawEventInput): boolean {
  return Boolean(
    input.triggerDream ||
    input.event.kind === 'reflection' ||
    (input.event.importance ?? 0) >= 0.9,
  );
}

export class ClawService {
  constructor(
    private readonly sessions: SessionService,
    private readonly memories: MemoryService,
    private readonly dreams: DreamService,
  ) {}

  async ingestEvent(agentId: string, input: ClawEventInput) {
    const session = input.session
      ? await this.sessions.createOrGet({
          agentId,
          externalId: input.session.id,
          channel: input.session.channel,
          metadata: input.session.metadata,
        })
      : undefined;

    const memory = await this.memories.storeMemory({
      agentId,
      sessionId: session?.id,
      type: kindToMemoryType(input.event),
      content: input.event.content,
      summary: input.event.summary,
      tags: deriveTags(input, session?.channel),
      metadata: buildMetadata(input, session?.id),
      importance: input.event.importance,
      source: input.event.source || 'claw-event',
    });

    if (!shouldAutoDream(input)) {
      return { session, memory, dream: null };
    }

    const dream = await this.dreams.run(agentId, { maxSourceMemories: 10 });
    return { session, memory, dream };
  }

  async buildContext(input: {
    agentId: string;
    query?: string;
    tags?: string[];
    limit?: number;
    memoryTypes?: MemoryType[];
    metadataFilters?: RecallMetadataFilters;
  }) {
    const memories = await this.memories.recall(input);
    const stats = await this.memories.stats(input.agentId);

    return {
      summaries: memories.map((memory) => ({
        id: memory.id,
        type: memory.type,
        summary: memory.summary,
        tags: memory.tags,
        importance: memory.importance,
        metadata: memory.metadata,
        score: memory.score,
      })),
      contextText: memories
        .map((memory) => {
          const parts = [`[${memory.type}]`, memory.summary];
          const toolName = typeof memory.metadata.toolName === 'string' ? memory.metadata.toolName : undefined;
          const action = typeof memory.metadata.action === 'string' ? memory.metadata.action : undefined;
          const outcome = typeof memory.metadata.outcome === 'string' ? memory.metadata.outcome : undefined;
          if (toolName) parts.push(`tool=${toolName}`);
          if (action) parts.push(`action=${action}`);
          if (outcome) parts.push(`outcome=${outcome}`);
          return `- ${parts.join(' | ')}`;
        })
        .join('\n'),
      stats,
    };
  }
}

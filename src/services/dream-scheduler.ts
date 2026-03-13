import type { DreamScheduleRecord } from '../types';
import { DreamService } from './dream-service';

export class DreamScheduler {
  private readonly jobs = new Map<string, NodeJS.Timeout>();
  private readonly schedules = new Map<string, DreamScheduleRecord>();

  constructor(private readonly dreamService: DreamService) {}

  start(agentId: string, intervalMs: number): DreamScheduleRecord {
    this.stop(agentId);

    const timer = setInterval(() => {
      void this.dreamService.run(agentId).then(() => {
        const schedule = this.schedules.get(agentId);
        if (schedule) {
          schedule.lastRunAt = new Date().toISOString();
        }
      });
    }, intervalMs);

    this.jobs.set(agentId, timer);
    const schedule: DreamScheduleRecord = {
      agentId,
      intervalMs,
      active: true,
    };
    this.schedules.set(agentId, schedule);
    return schedule;
  }

  stop(agentId: string): DreamScheduleRecord | null {
    const existing = this.jobs.get(agentId);
    if (existing) {
      clearInterval(existing);
      this.jobs.delete(agentId);
    }

    const schedule = this.schedules.get(agentId);
    if (!schedule) {
      return null;
    }

    schedule.active = false;
    this.schedules.set(agentId, schedule);
    return schedule;
  }

  list(): DreamScheduleRecord[] {
    return [...this.schedules.values()].sort((a, b) => a.agentId.localeCompare(b.agentId));
  }
}

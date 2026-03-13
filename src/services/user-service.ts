import type { StoreAdapter } from '../storage';
import type { UserRecord } from '../types';
import { createId } from './id';

export class UserService {
  constructor(private readonly store: StoreAdapter) {}

  async upsertGoogleUser(input: { googleSub: string; email: string; name: string; picture?: string }): Promise<UserRecord> {
    const state = await this.store.read();
    const now = new Date().toISOString();
    const existing = state.users.find((user) => user.googleSub === input.googleSub || user.email.toLowerCase() === input.email.toLowerCase());

    if (existing) {
      existing.googleSub = input.googleSub;
      existing.email = input.email;
      existing.name = input.name;
      existing.picture = input.picture;
      existing.updatedAt = now;
      await this.store.write(state);
      return existing;
    }

    const user: UserRecord = {
      id: createId('usr'),
      googleSub: input.googleSub,
      email: input.email,
      name: input.name,
      picture: input.picture,
      createdAt: now,
      updatedAt: now,
    };

    state.users.push(user);
    await this.store.write(state);
    return user;
  }

  async getById(id: string): Promise<UserRecord | undefined> {
    const state = await this.store.read();
    return state.users.find((user) => user.id === id);
  }
}

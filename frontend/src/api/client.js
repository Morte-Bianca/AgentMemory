export class AgentClient {
  constructor() {
    this.apiKey = localStorage.getItem('agentMemory_apiKey') || null;
    this.agent = JSON.parse(localStorage.getItem('agentMemory_agent') || 'null');
  }

  setCredentials(agent, apiKey) {
    this.apiKey = apiKey;
    this.agent = agent;
    localStorage.setItem('agentMemory_apiKey', apiKey);
    localStorage.setItem('agentMemory_agent', JSON.stringify(agent));
  }

  clearCredentials() {
    this.apiKey = null;
    this.agent = null;
    localStorage.removeItem('agentMemory_apiKey');
    localStorage.removeItem('agentMemory_agent');
  }

  async fetch(url, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  // --- Auth & Identity ---
  async createAgent(name) {
    const data = await this.fetch('/v1/agents', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
    this.setCredentials(data.agent, data.apiKey);
    return data;
  }

  async getMe() {
    return this.fetch('/v1/agents/me');
  }

  async rotateApiKey() {
    const data = await this.fetch('/v1/agents/me/api-key/rotate', { method: 'POST' });
    this.setCredentials(this.agent, data.apiKey);
    return data;
  }

  async revokeApiKey() {
    await this.fetch('/v1/agents/me/api-key/revoke', { method: 'POST' });
    this.clearCredentials();
  }

  // --- Sessions ---
  async getSessions() {
    return this.fetch(`/v1/agents/${this.agent?.id}/sessions`);
  }

  // --- Memory ---
  async getMemoryStats() {
    return this.fetch(`/v1/agents/${this.agent.id}/memories/stats`);
  }

  async addMemory(memoryData) {
    return this.fetch('/v1/memories', {
      method: 'POST',
      body: JSON.stringify(memoryData)
    });
  }

  async recallMemories(queryData) {
    return this.fetch('/v1/memories/recall', {
      method: 'POST',
      body: JSON.stringify(queryData)
    });
  }

  // --- Dreams ---
  async runDream() {
    return this.fetch('/v1/dreams/run', {
      method: 'POST',
      body: JSON.stringify({}) // Add empty body if needed
    });
  }

  async getDreams() {
    return this.fetch(`/v1/agents/${this.agent.id}/dreams`);
  }

  // --- Dream Schedule ---
  async getDreamSchedule() {
    return this.fetch('/v1/dreams/schedule');
  }

  async startDreamSchedule() {
    return this.fetch('/v1/dreams/schedule/start', { method: 'POST' });
  }

  async stopDreamSchedule() {
    return this.fetch('/v1/dreams/schedule/stop', { method: 'POST' });
  }
}

export const client = new AgentClient();

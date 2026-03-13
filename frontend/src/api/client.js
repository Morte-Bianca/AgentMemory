export class AgentClient {
  constructor() {
    this.apiKey = localStorage.getItem('agentMemory_apiKey') || null;
    this.agent = JSON.parse(localStorage.getItem('agentMemory_agent') || 'null');
    this.sessionToken = localStorage.getItem('agentMemory_sessionToken') || null;
    this.user = JSON.parse(localStorage.getItem('agentMemory_user') || 'null');
  }

  setSession(user, sessionToken, agent = null) {
    this.user = user;
    this.sessionToken = sessionToken;
    localStorage.setItem('agentMemory_sessionToken', sessionToken);
    localStorage.setItem('agentMemory_user', JSON.stringify(user));
    if (agent) {
      this.agent = agent;
      localStorage.setItem('agentMemory_agent', JSON.stringify(agent));
    }
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

  clearSession() {
    this.user = null;
    this.sessionToken = null;
    localStorage.removeItem('agentMemory_sessionToken');
    localStorage.removeItem('agentMemory_user');
  }

  clearAll() {
    this.clearCredentials();
    this.clearSession();
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

  async fetchWithUserSession(url, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.sessionToken) {
      headers['x-user-session'] = this.sessionToken;
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
      throw new Error(errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  // --- Auth & Identity ---
  async loginWithGoogle(credential) {
    const data = await this.fetch('/v1/auth/google', {
      method: 'POST',
      body: JSON.stringify({ credential }),
    });
    this.setSession(data.user, data.sessionToken, data.agent || null);
    return data;
  }

  async getAuthMe() {
    const data = await this.fetchWithUserSession('/v1/auth/me');
    this.user = data.user;
    localStorage.setItem('agentMemory_user', JSON.stringify(data.user));
    if (data.agent) {
      this.agent = data.agent;
      localStorage.setItem('agentMemory_agent', JSON.stringify(data.agent));
    }
    return data;
  }

  async initializeIdentity(name) {
    const data = await this.fetchWithUserSession('/v1/agents/initialize', {
      method: 'POST',
      body: JSON.stringify(name ? { name } : {}),
    });
    this.setCredentials(data.agent, data.apiKey);
    return data;
  }

  async createAgent(name) {
    return this.initializeIdentity(name);
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

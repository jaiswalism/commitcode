import { ProblemRecord, Settings, SyncLogEntry, RetryQueueItem } from './types';

const SCHEMA_VERSION = 1;

export const DEFAULT_SETTINGS: Settings = {
  pat: null,
  repository: null,
  folderStructure: 'Difficulty',
  versionMode: 'versioned',
  commitTemplate: "Solved: {title}\nDifficulty: {difficulty}\nLanguage: {language}\nRuntime: {runtime}",
  autoSync: true,
  readmeEnabled: true,
  schemaVersion: SCHEMA_VERSION,
};

export const db = {
  async get<T>(key: string): Promise<T | null> {
    const result = await chrome.storage.local.get(key);
    return result[key] || null;
  },

  async set<T>(key: string, value: T): Promise<void> {
    await chrome.storage.local.set({ [key]: value });
  },

  async getSettings(): Promise<Settings> {
    const settings = await this.get<Settings>('settings');
    if (!settings) return DEFAULT_SETTINGS;
    
    // Future migration logic can go here based on settings.schemaVersion
    return settings;
  },

  async updateSettings(partial: Partial<Settings>): Promise<Settings> {
    const current = await this.getSettings();
    const updated = { ...current, ...partial };
    await this.set('settings', updated);
    return updated;
  },

  async getAllProblems(): Promise<ProblemRecord[]> {
    const data = await chrome.storage.local.get(null);
    const problems: ProblemRecord[] = [];
    for (const key in data) {
      if (key.startsWith('problems:')) {
        problems.push(data[key]);
      }
    }
    return problems;
  },

  async saveProblem(problem: ProblemRecord): Promise<void> {
    await this.set(`problems:${problem.id}:${problem.language}`, problem);
  },

  async getProblem(id: string, language: string): Promise<ProblemRecord | null> {
    return this.get<ProblemRecord>(`problems:${id}:${language}`);
  },

  async addLogEntry(entry: SyncLogEntry): Promise<void> {
    const dateKey = new Date(entry.timestamp).toISOString().split('T')[0];
    const logsKey = `log:${dateKey}`;
    const logs = (await this.get<SyncLogEntry[]>(logsKey)) || [];
    logs.push(entry);
    await this.set(logsKey, logs);
  },

  async getLogs(date: Date): Promise<SyncLogEntry[]> {
    const dateKey = date.toISOString().split('T')[0];
    return (await this.get<SyncLogEntry[]>(`log:${dateKey}`)) || [];
  },

  async pushToQueue(item: Omit<RetryQueueItem, 'attempts'>): Promise<void> {
    const queue = await this.getQueue();
    const existing = queue.find(q => q.problem.id === item.problem.id && q.problem.language === item.problem.language);
    if (existing) {
      existing.reason = item.reason;
      existing.timestamp = item.timestamp;
      // Keep existing attempts
      existing.problem = item.problem; // Update problem in case the code changed again
    } else {
      queue.push({
        ...item,
        attempts: 0
      });
    }
    await this.saveQueue(queue);
  },

  async getQueue(): Promise<RetryQueueItem[]> {
    return (await this.get<RetryQueueItem[]>('queue')) || [];
  },

  async saveQueue(queue: RetryQueueItem[]): Promise<void> {
    await this.set('queue', queue);
  },

  async removeFromQueue(problemId: string, language: string): Promise<void> {
    const queue = await this.getQueue();
    const updatedQueue = queue.filter(q => !(q.problem.id === problemId && q.problem.language === language));
    await this.saveQueue(updatedQueue);
  }
};

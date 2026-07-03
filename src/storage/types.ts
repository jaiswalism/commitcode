export interface ProblemRecord {
  id: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  language: string;
  runtime: string;
  memory: string;
  submissionTime: number;
  tags?: string[];
  companyTags?: string[];
  code: string;
  url: string;
  version: number;
}

export type FolderStructure = 'Difficulty' | 'Topic' | 'Language' | 'Number' | 'Flat';

export interface Settings {
  pat: string | null;
  repository: string | null;
  folderStructure: FolderStructure;
  versionMode: 'versioned' | 'overwrite';
  commitTemplate: string;
  autoSync: boolean;
  readmeEnabled: boolean;
  schemaVersion: number;
}

export interface SyncLogEntry {
  problemId: string;
  title: string;
  timestamp: number;
  status: 'success' | 'failure' | 'skipped';
  reason?: string;
}

export interface RetryQueueItem {
  problem: ProblemRecord;
  reason: string;
  timestamp: number;
  attempts: number;
}

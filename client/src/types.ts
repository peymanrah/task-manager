export type TaskStatus = 'pending' | 'in-progress' | 'done' | 'failed' | 'blocked';

export interface LogEntry {
  timestamp: string;
  message: string;
}

export interface Subtask {
  id: string;
  title: string;
  status: TaskStatus;
  progress: number;
  logs: LogEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  progress: number;
  subtasks: Subtask[];
  githubRepo: string;
  branch: string;
  prUrl: string;
  associatedFiles: string[];
  createdAt: string;
  updatedAt: string;
  logs: LogEntry[];
}

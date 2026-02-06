import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

// ─── Types ───────────────────────────────────────────────────────────────────

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

// ─── Paths ───────────────────────────────────────────────────────────────────

const DATA_DIR = process.env.TASK_MANAGER_DATA_DIR || path.resolve(__dirname, '..', '..', 'data');
const TASKS_FILE = process.env.TASK_MANAGER_DATA_FILE || path.join(DATA_DIR, 'tasks.json');

export function getTasksFilePath(): string {
  return TASKS_FILE;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(TASKS_FILE)) {
    fs.writeFileSync(TASKS_FILE, '[]', 'utf-8');
  }
}

function readTasks(): Task[] {
  ensureDataDir();
  const raw = fs.readFileSync(TASKS_FILE, 'utf-8');
  try {
    return JSON.parse(raw) as Task[];
  } catch {
    return [];
  }
}

function writeTasks(tasks: Task[]): void {
  ensureDataDir();
  fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2), 'utf-8');
}

function now(): string {
  return new Date().toISOString();
}

// ─── CRUD Operations ─────────────────────────────────────────────────────────

export function getAllTasks(): Task[] {
  return readTasks();
}

export function getTaskById(id: string): Task | undefined {
  return readTasks().find((t) => t.id === id);
}

export function createTask(params: {
  title: string;
  description?: string;
  githubRepo?: string;
  branch?: string;
}): Task {
  const tasks = readTasks();
  const task: Task = {
    id: uuidv4(),
    title: params.title,
    description: params.description || '',
    status: 'pending',
    progress: 0,
    subtasks: [],
    githubRepo: params.githubRepo || '',
    branch: params.branch || '',
    prUrl: '',
    associatedFiles: [],
    createdAt: now(),
    updatedAt: now(),
    logs: [{ timestamp: now(), message: `Task created: ${params.title}` }],
  };
  tasks.push(task);
  writeTasks(tasks);
  return task;
}

export function updateTask(
  id: string,
  updates: Partial<Omit<Task, 'id' | 'createdAt'>>
): Task | null {
  const tasks = readTasks();
  const idx = tasks.findIndex((t) => t.id === id);
  if (idx === -1) return null;

  tasks[idx] = {
    ...tasks[idx],
    ...updates,
    updatedAt: now(),
  };

  // Auto-compute progress from subtasks if subtasks exist
  if (tasks[idx].subtasks.length > 0) {
    const total = tasks[idx].subtasks.length;
    const doneCount = tasks[idx].subtasks.filter((s) => s.status === 'done').length;
    tasks[idx].progress = Math.round((doneCount / total) * 100);
  }

  // Auto-set status to done if progress is 100
  if (tasks[idx].progress === 100 && tasks[idx].status === 'in-progress') {
    tasks[idx].status = 'done';
  }

  writeTasks(tasks);
  return tasks[idx];
}

export function deleteTask(id: string): boolean {
  const tasks = readTasks();
  const idx = tasks.findIndex((t) => t.id === id);
  if (idx === -1) return false;
  tasks.splice(idx, 1);
  writeTasks(tasks);
  return true;
}

export function addSubtask(
  taskId: string,
  params: { title: string }
): Subtask | null {
  const tasks = readTasks();
  const idx = tasks.findIndex((t) => t.id === taskId);
  if (idx === -1) return null;

  const subtask: Subtask = {
    id: uuidv4(),
    title: params.title,
    status: 'pending',
    progress: 0,
    logs: [{ timestamp: now(), message: `Subtask created: ${params.title}` }],
    createdAt: now(),
    updatedAt: now(),
  };

  tasks[idx].subtasks.push(subtask);
  tasks[idx].updatedAt = now();
  writeTasks(tasks);
  return subtask;
}

export function updateSubtask(
  taskId: string,
  subtaskId: string,
  updates: Partial<Omit<Subtask, 'id' | 'createdAt'>>
): Subtask | null {
  const tasks = readTasks();
  const taskIdx = tasks.findIndex((t) => t.id === taskId);
  if (taskIdx === -1) return null;

  const subIdx = tasks[taskIdx].subtasks.findIndex((s) => s.id === subtaskId);
  if (subIdx === -1) return null;

  tasks[taskIdx].subtasks[subIdx] = {
    ...tasks[taskIdx].subtasks[subIdx],
    ...updates,
    updatedAt: now(),
  };

  // Recompute parent task progress
  const total = tasks[taskIdx].subtasks.length;
  const doneCount = tasks[taskIdx].subtasks.filter((s) => s.status === 'done').length;
  tasks[taskIdx].progress = Math.round((doneCount / total) * 100);
  tasks[taskIdx].updatedAt = now();

  if (tasks[taskIdx].progress === 100 && tasks[taskIdx].status === 'in-progress') {
    tasks[taskIdx].status = 'done';
  }

  writeTasks(tasks);
  return tasks[taskIdx].subtasks[subIdx];
}

export function appendLog(taskId: string, message: string, subtaskId?: string): boolean {
  const tasks = readTasks();
  const taskIdx = tasks.findIndex((t) => t.id === taskId);
  if (taskIdx === -1) return false;

  const entry: LogEntry = { timestamp: now(), message };

  if (subtaskId) {
    const subIdx = tasks[taskIdx].subtasks.findIndex((s) => s.id === subtaskId);
    if (subIdx === -1) return false;
    tasks[taskIdx].subtasks[subIdx].logs.push(entry);
    tasks[taskIdx].subtasks[subIdx].updatedAt = now();
  } else {
    tasks[taskIdx].logs.push(entry);
  }

  tasks[taskIdx].updatedAt = now();
  writeTasks(tasks);
  return true;
}

export function deleteSubtask(taskId: string, subtaskId: string): boolean {
  const tasks = readTasks();
  const taskIdx = tasks.findIndex((t) => t.id === taskId);
  if (taskIdx === -1) return false;

  const subIdx = tasks[taskIdx].subtasks.findIndex((s) => s.id === subtaskId);
  if (subIdx === -1) return false;

  tasks[taskIdx].subtasks.splice(subIdx, 1);
  tasks[taskIdx].updatedAt = now();

  // Recompute progress
  if (tasks[taskIdx].subtasks.length > 0) {
    const total = tasks[taskIdx].subtasks.length;
    const doneCount = tasks[taskIdx].subtasks.filter((s) => s.status === 'done').length;
    tasks[taskIdx].progress = Math.round((doneCount / total) * 100);
  }

  writeTasks(tasks);
  return true;
}

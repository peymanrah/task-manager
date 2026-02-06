import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Use a temp file for tests — NEVER touch production data/tasks.json
const TEST_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'task-manager-test-'));
const TEST_TASKS_FILE = path.join(TEST_DATA_DIR, 'tasks.json');
process.env.TASK_MANAGER_DATA_DIR = TEST_DATA_DIR;
process.env.TASK_MANAGER_DATA_FILE = TEST_TASKS_FILE;

import {
  getAllTasks,
  createTask,
  getTaskById,
  updateTask,
  deleteTask,
  addSubtask,
  updateSubtask,
  deleteSubtask,
  appendLog,
  getTasksFilePath,
  Task,
} from './taskStore';

function resetTasksFile() {
  fs.writeFileSync(TEST_TASKS_FILE, '[]', 'utf-8');
}

beforeEach(() => {
  resetTasksFile();
});

afterAll(() => {
  // Clean up temp directory
  try {
    fs.rmSync(TEST_DATA_DIR, { recursive: true });
  } catch {}
});

describe('taskStore', () => {
  describe('createTask', () => {
    it('should create a task with default values', () => {
      const task = createTask({ title: 'Test Task' });
      expect(task.id).toBeDefined();
      expect(task.title).toBe('Test Task');
      expect(task.status).toBe('pending');
      expect(task.progress).toBe(0);
      expect(task.subtasks).toEqual([]);
      expect(task.logs).toHaveLength(1);
      expect(task.logs[0].message).toContain('Task created');
    });

    it('should persist task to file', () => {
      createTask({ title: 'Persisted Task' });
      const raw = fs.readFileSync(TEST_TASKS_FILE, 'utf-8');
      const tasks = JSON.parse(raw);
      expect(tasks).toHaveLength(1);
      expect(tasks[0].title).toBe('Persisted Task');
    });

    it('should create multiple tasks', () => {
      createTask({ title: 'Task 1' });
      createTask({ title: 'Task 2' });
      createTask({ title: 'Task 3' });
      expect(getAllTasks()).toHaveLength(3);
    });
  });

  describe('getAllTasks', () => {
    it('should return empty array when no tasks', () => {
      expect(getAllTasks()).toEqual([]);
    });

    it('should return all created tasks', () => {
      createTask({ title: 'A' });
      createTask({ title: 'B' });
      const tasks = getAllTasks();
      expect(tasks).toHaveLength(2);
      expect(tasks.map((t) => t.title)).toEqual(['A', 'B']);
    });
  });

  describe('getTaskById', () => {
    it('should find an existing task', () => {
      const created = createTask({ title: 'Find Me' });
      const found = getTaskById(created.id);
      expect(found).toBeDefined();
      expect(found!.title).toBe('Find Me');
    });

    it('should return undefined for non-existent id', () => {
      expect(getTaskById('non-existent')).toBeUndefined();
    });
  });

  describe('updateTask', () => {
    it('should update task status and progress', () => {
      const task = createTask({ title: 'Update Me' });
      const updated = updateTask(task.id, { status: 'in-progress', progress: 50 });
      expect(updated).not.toBeNull();
      expect(updated!.status).toBe('in-progress');
      expect(updated!.progress).toBe(50);
    });

    it('should return null for non-existent task', () => {
      expect(updateTask('fake-id', { status: 'done' })).toBeNull();
    });

    it('should update githubRepo and prUrl', () => {
      const task = createTask({ title: 'GH Task' });
      const updated = updateTask(task.id, {
        githubRepo: 'https://github.com/test/repo',
        prUrl: 'https://github.com/test/repo/pull/1',
      });
      expect(updated!.githubRepo).toBe('https://github.com/test/repo');
      expect(updated!.prUrl).toBe('https://github.com/test/repo/pull/1');
    });
  });

  describe('deleteTask', () => {
    it('should delete an existing task', () => {
      const task = createTask({ title: 'Delete Me' });
      expect(deleteTask(task.id)).toBe(true);
      expect(getAllTasks()).toHaveLength(0);
    });

    it('should return false for non-existent task', () => {
      expect(deleteTask('fake-id')).toBe(false);
    });
  });

  describe('addSubtask', () => {
    it('should add a subtask to an existing task', () => {
      const task = createTask({ title: 'Parent' });
      const sub = addSubtask(task.id, { title: 'Child' });
      expect(sub).not.toBeNull();
      expect(sub!.title).toBe('Child');
      expect(sub!.status).toBe('pending');

      const updated = getTaskById(task.id);
      expect(updated!.subtasks).toHaveLength(1);
    });

    it('should return null for non-existent parent', () => {
      expect(addSubtask('fake-id', { title: 'Orphan' })).toBeNull();
    });
  });

  describe('updateSubtask', () => {
    it('should update subtask status', () => {
      const task = createTask({ title: 'Parent' });
      const sub = addSubtask(task.id, { title: 'Sub' })!;
      const updated = updateSubtask(task.id, sub.id, { status: 'done' });
      expect(updated!.status).toBe('done');
    });

    it('should auto-compute parent progress from subtasks', () => {
      const task = createTask({ title: 'Parent' });
      const sub1 = addSubtask(task.id, { title: 'Sub 1' })!;
      addSubtask(task.id, { title: 'Sub 2' });
      updateSubtask(task.id, sub1.id, { status: 'done' });
      const parent = getTaskById(task.id);
      expect(parent!.progress).toBe(50);
    });

    it('should return null for non-existent subtask', () => {
      const task = createTask({ title: 'Parent' });
      expect(updateSubtask(task.id, 'fake', { status: 'done' })).toBeNull();
    });
  });

  describe('deleteSubtask', () => {
    it('should remove a subtask', () => {
      const task = createTask({ title: 'Parent' });
      const sub = addSubtask(task.id, { title: 'Sub' })!;
      expect(deleteSubtask(task.id, sub.id)).toBe(true);
      expect(getTaskById(task.id)!.subtasks).toHaveLength(0);
    });

    it('should return false for non-existent subtask', () => {
      const task = createTask({ title: 'Parent' });
      expect(deleteSubtask(task.id, 'fake')).toBe(false);
    });
  });

  describe('appendLog', () => {
    it('should append a log entry to a task', () => {
      const task = createTask({ title: 'Logged' });
      expect(appendLog(task.id, 'Something happened')).toBe(true);
      const updated = getTaskById(task.id);
      expect(updated!.logs).toHaveLength(2); // 1 from creation + 1 appended
      expect(updated!.logs[1].message).toBe('Something happened');
    });

    it('should append a log entry to a subtask', () => {
      const task = createTask({ title: 'Parent' });
      const sub = addSubtask(task.id, { title: 'Sub' })!;
      expect(appendLog(task.id, 'Sub log', sub.id)).toBe(true);
      const updated = getTaskById(task.id);
      expect(updated!.subtasks[0].logs).toHaveLength(2);
    });

    it('should return false for non-existent task', () => {
      expect(appendLog('fake', 'msg')).toBe(false);
    });
  });
});

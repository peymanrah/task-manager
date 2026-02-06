import supertest from 'supertest';
import * as fs from 'fs';
import { app } from './index';
import { createTask, getTasksFilePath } from './taskStore';

const TASKS_FILE = getTasksFilePath();
const request = supertest(app);

function resetTasksFile() {
  fs.writeFileSync(TASKS_FILE, '[]', 'utf-8');
}

beforeEach(() => {
  resetTasksFile();
});

afterAll(() => {
  resetTasksFile();
});

describe('REST API', () => {
  describe('GET /api/tasks', () => {
    it('should return empty array initially', async () => {
      const res = await request.get('/api/tasks');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('should return all tasks', async () => {
      createTask({ title: 'Task 1' });
      createTask({ title: 'Task 2' });
      const res = await request.get('/api/tasks');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });
  });

  describe('GET /api/tasks/:id', () => {
    it('should return a specific task', async () => {
      const task = createTask({ title: 'Specific' });
      const res = await request.get(`/api/tasks/${task.id}`);
      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Specific');
    });

    it('should return 404 for non-existent task', async () => {
      const res = await request.get('/api/tasks/fake-id');
      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/tasks/:id', () => {
    it('should update a task', async () => {
      const task = createTask({ title: 'Patch Me' });
      const res = await request
        .patch(`/api/tasks/${task.id}`)
        .send({ status: 'in-progress', progress: 25 });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('in-progress');
      expect(res.body.progress).toBe(25);
    });

    it('should return 404 for non-existent task', async () => {
      const res = await request.patch('/api/tasks/fake-id').send({ status: 'done' });
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/tasks/:id', () => {
    it('should delete a task', async () => {
      const task = createTask({ title: 'Delete Me' });
      const res = await request.delete(`/api/tasks/${task.id}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const check = await request.get('/api/tasks');
      expect(check.body).toHaveLength(0);
    });

    it('should return 404 for non-existent task', async () => {
      const res = await request.delete('/api/tasks/fake-id');
      expect(res.status).toBe(404);
    });
  });
});

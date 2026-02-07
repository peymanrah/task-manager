import express from 'express';
import cors from 'cors';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import chokidar from 'chokidar';
import path from 'path';
import {
  getAllTasks,
  getTaskById,
  updateTask,
  deleteTask,
  deleteSubtask,
  getTasksFilePath,
  getSpec,
  writeSpec,
  deleteSpec,
  getSpecsDir,
  classifyTopic,
} from './taskStore';

import * as fs from 'fs';
import * as os from 'os';

const PORT = parseInt(process.env.PORT || '4567', 10);
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.text({ type: 'text/plain' }));

// ─── REST API ────────────────────────────────────────────────────────────────

app.get('/api/tasks', (_req, res) => {
  const tasks = getAllTasks();
  let dirty = false;
  for (const t of tasks) {
    if (!t.topic) {
      t.topic = classifyTopic(t.title, t.description);
      dirty = true;
    }
  }
  if (dirty) {
    // Persist backfilled topics so they stick
    const tasksFile = getTasksFilePath();
    fs.writeFileSync(tasksFile, JSON.stringify(tasks, null, 2), 'utf-8');
  }
  res.json(tasks);
});

app.get('/api/tasks/:id', (req, res) => {
  const task = getTaskById(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json(task);
});

app.patch('/api/tasks/:id', (req, res) => {
  const updated = updateTask(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Task not found' });
  res.json(updated);
});

app.delete('/api/tasks/:id', (req, res) => {
  const deleted = deleteTask(req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Task not found' });
  deleteSpec(req.params.id);
  res.json({ success: true });
});

app.delete('/api/tasks/:taskId/subtasks/:subtaskId', (req, res) => {
  const deleted = deleteSubtask(req.params.taskId, req.params.subtaskId);
  if (!deleted) return res.status(404).json({ error: 'Subtask not found' });
  res.json({ success: true });
});

// ─── Spec API ────────────────────────────────────────────────────────────────

app.get('/api/tasks/:id/spec', (req, res) => {
  const task = getTaskById(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  const spec = getSpec(req.params.id);
  res.json({ taskId: req.params.id, spec });
});

app.put('/api/tasks/:id/spec', (req, res) => {
  const task = getTaskById(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  const content = typeof req.body === 'string' ? req.body : req.body.spec || '';
  writeSpec(req.params.id, content);
  res.json({ taskId: req.params.id, success: true });
});

// ─── Export / Import API ─────────────────────────────────────────────────────

app.get('/api/export', (_req, res) => {
  const tasks = getAllTasks();
  const specsDir = getSpecsDir();
  const bundle = {
    exportedAt: new Date().toISOString(),
    version: '1.0.0',
    tasks: tasks.map(t => {
      const specPath = path.join(specsDir, `${t.id}.md`);
      const spec = fs.existsSync(specPath) ? fs.readFileSync(specPath, 'utf-8') : '';
      return { ...t, spec };
    }),
  };
  res.setHeader('Content-Disposition', 'attachment; filename="task-manager-export.json"');
  res.json(bundle);
});

// ─── Lessons Learned API ─────────────────────────────────────────────────────

app.get('/api/lessons', (_req, res) => {
  const tasks = getAllTasks();
  const specsDir = getSpecsDir();
  const lessons: Array<{ taskId: string; taskTitle: string; status: string; whatWorked: string; whatDidntWork: string; aiAgentNotes: string }> = [];

  for (const task of tasks) {
    const specPath = path.join(specsDir, `${task.id}.md`);
    if (!fs.existsSync(specPath)) continue;
    const spec = fs.readFileSync(specPath, 'utf-8');

    const workedMatch = spec.match(/## ✅ What Worked\n([\s\S]*?)(?=\n## |$)/);
    const didntMatch = spec.match(/## ❌ What Didn't Work\n([\s\S]*?)(?=\n## |$)/);
    const patternsMatch = spec.match(/## 🧠 AI Agent Notes\n([\s\S]*?)(?=\n## |$)/);

    if (workedMatch || didntMatch || patternsMatch) {
      lessons.push({
        taskId: task.id,
        taskTitle: task.title,
        status: task.status,
        whatWorked: workedMatch ? workedMatch[1].trim() : '',
        whatDidntWork: didntMatch ? didntMatch[1].trim() : '',
        aiAgentNotes: patternsMatch ? patternsMatch[1].trim() : '',
      });
    }
  }

  res.json(lessons);
});

// ─── User Info API ───────────────────────────────────────────────────────────

app.get('/api/user', (_req, res) => {
  const username = os.userInfo().username || process.env.USERNAME || 'User';
  // Try to get git config for name/email
  let displayName = username;
  let email = '';
  try {
    const { execSync } = require('child_process');
    displayName = execSync('git config user.name', { encoding: 'utf-8' }).trim() || username;
    email = execSync('git config user.email', { encoding: 'utf-8' }).trim();
  } catch { /* fallback to OS username */ }
  res.json({ username, displayName, email });
});

// Serve static React build
const clientDist = path.resolve(__dirname, '..', '..', 'client', 'dist');
app.use(express.static(clientDist));
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

// ─── HTTP + WebSocket Server ─────────────────────────────────────────────────

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const clients = new Set<WebSocket>();

wss.on('connection', (ws) => {
  clients.add(ws);
  // Send current state immediately on connect
  ws.send(JSON.stringify({ type: 'FULL_STATE', tasks: getAllTasks() }));
  ws.on('close', () => clients.delete(ws));
});

function broadcast(): void {
  const payload = JSON.stringify({ type: 'FULL_STATE', tasks: getAllTasks() });
  clients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  });
}

// ─── File Watcher ────────────────────────────────────────────────────────────

const tasksFile = getTasksFilePath();
const watcher = chokidar.watch(tasksFile, {
  persistent: true,
  ignoreInitial: true,
  awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 },
});

watcher.on('change', () => {
  broadcast();
});

// ─── Start ───────────────────────────────────────────────────────────────────

if (require.main === module) {
  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n❌ Port ${PORT} is already in use. Retrying in 3s...\n`);
      setTimeout(() => {
        server.close();
        server.listen(PORT);
      }, 3000);
    } else {
      console.error('Server error:', err);
      process.exit(1);
    }
  });

  server.listen(PORT, () => {
    console.log(`\n🚀 Task Manager Control Tower Server running on http://localhost:${PORT}`);
    console.log(`   WebSocket active on ws://localhost:${PORT}`);
    console.log(`   Watching: ${tasksFile}\n`);
  });

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down gracefully...');
    watcher.close();
    wss.close();
    server.close(() => process.exit(0));
  });

  process.on('SIGTERM', () => {
    watcher.close();
    wss.close();
    server.close(() => process.exit(0));
  });

  // Catch unhandled errors to prevent crashing
  process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err);
  });

  process.on('unhandledRejection', (reason) => {
    console.error('Unhandled rejection:', reason);
  });
}

export { app, server, wss, broadcast };

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
} from './taskStore';

const PORT = parseInt(process.env.PORT || '4567', 10);
const app = express();
app.use(cors());
app.use(express.json());

// ─── REST API ────────────────────────────────────────────────────────────────

app.get('/api/tasks', (_req, res) => {
  res.json(getAllTasks());
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
  res.json({ success: true });
});

app.delete('/api/tasks/:taskId/subtasks/:subtaskId', (req, res) => {
  const deleted = deleteSubtask(req.params.taskId, req.params.subtaskId);
  if (!deleted) return res.status(404).json({ error: 'Subtask not found' });
  res.json({ success: true });
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
  server.listen(PORT, () => {
    console.log(`\n🚀 Task Manager Control Tower Server running on http://localhost:${PORT}`);
    console.log(`   WebSocket active on ws://localhost:${PORT}`);
    console.log(`   Watching: ${tasksFile}\n`);
  });
}

export { app, server, wss, broadcast };

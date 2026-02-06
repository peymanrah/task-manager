import { updateTask, addSubtask, updateSubtask } from '../taskStore';

// Usage:
//   npx ts-node src/cli/updateTask.ts --id <taskId> --status done --progress 100
//   npx ts-node src/cli/updateTask.ts --id <taskId> --add-subtask "Subtask title"
//   npx ts-node src/cli/updateTask.ts --id <taskId> --subtask-id <subId> --status done

const args = process.argv.slice(2);

function getArg(name: string): string {
  const idx = args.indexOf(`--${name}`);
  if (idx === -1 || idx + 1 >= args.length) return '';
  return args[idx + 1];
}

const id = getArg('id');
if (!id) {
  console.error('❌ --id is required');
  process.exit(1);
}

// Add subtask mode
const subtaskTitle = getArg('add-subtask');
if (subtaskTitle) {
  const sub = addSubtask(id, { title: subtaskTitle });
  if (!sub) {
    console.error('❌ Task not found');
    process.exit(1);
  }
  console.log(`✅ Subtask added: ${sub.id} — "${sub.title}"`);
  process.exit(0);
}

// Update subtask mode
const subtaskId = getArg('subtask-id');
if (subtaskId) {
  const updates: any = {};
  const status = getArg('status');
  const progress = getArg('progress');
  if (status) updates.status = status;
  if (progress) updates.progress = parseInt(progress, 10);
  const sub = updateSubtask(id, subtaskId, updates);
  if (!sub) {
    console.error('❌ Task or subtask not found');
    process.exit(1);
  }
  console.log(`✅ Subtask updated: ${sub.id} — status: ${sub.status}`);
  process.exit(0);
}

// Update task mode
const updates: any = {};
const status = getArg('status');
const progress = getArg('progress');
const title = getArg('title');
const desc = getArg('desc');
const repo = getArg('repo');
const branch = getArg('branch');
const prUrl = getArg('pr-url');

if (status) updates.status = status;
if (progress) updates.progress = parseInt(progress, 10);
if (title) updates.title = title;
if (desc) updates.description = desc;
if (repo) updates.githubRepo = repo;
if (branch) updates.branch = branch;
if (prUrl) updates.prUrl = prUrl;

const task = updateTask(id, updates);
if (!task) {
  console.error('❌ Task not found');
  process.exit(1);
}
console.log(`✅ Task updated: ${task.id} — status: ${task.status}, progress: ${task.progress}%`);

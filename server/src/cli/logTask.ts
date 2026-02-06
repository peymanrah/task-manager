import { appendLog } from '../taskStore';

// Usage: npx ts-node src/cli/logTask.ts --id <taskId> --msg "Log message" [--subtask-id <subId>]
const args = process.argv.slice(2);

function getArg(name: string): string {
  const idx = args.indexOf(`--${name}`);
  if (idx === -1 || idx + 1 >= args.length) return '';
  return args[idx + 1];
}

const id = getArg('id');
const msg = getArg('msg');
const subtaskId = getArg('subtask-id') || undefined;

if (!id || !msg) {
  console.error('❌ --id and --msg are required');
  process.exit(1);
}

const ok = appendLog(id, msg, subtaskId);
if (!ok) {
  console.error('❌ Task (or subtask) not found');
  process.exit(1);
}
console.log(`✅ Log appended to task ${id}`);

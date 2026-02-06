import { createTask } from '../taskStore';

// Usage: npx ts-node src/cli/createTask.ts --title "Task Title" --desc "Description" --repo "url" --branch "main"
const args = process.argv.slice(2);

function getArg(name: string): string {
  const idx = args.indexOf(`--${name}`);
  if (idx === -1 || idx + 1 >= args.length) return '';
  return args[idx + 1];
}

const title = getArg('title');
if (!title) {
  console.error('❌ --title is required');
  process.exit(1);
}

const task = createTask({
  title,
  description: getArg('desc') || undefined,
  githubRepo: getArg('repo') || undefined,
  branch: getArg('branch') || undefined,
});

console.log(`✅ Task created: ${task.id} — "${task.title}"`);

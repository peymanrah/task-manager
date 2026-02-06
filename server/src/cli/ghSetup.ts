import { execSync } from 'child_process';
import { updateTask, getTaskById } from '../taskStore';

// Usage: npx ts-node src/cli/ghSetup.ts --id <taskId> --name <repoName> --desc "Description"
const args = process.argv.slice(2);

function getArg(name: string): string {
  const idx = args.indexOf(`--${name}`);
  if (idx === -1 || idx + 1 >= args.length) return '';
  return args[idx + 1];
}

const taskId = getArg('id');
const repoName = getArg('name');
const desc = getArg('desc') || 'Auto-created by Task Manager Control Tower';

if (!taskId || !repoName) {
  console.error('❌ --id and --name are required');
  process.exit(1);
}

const task = getTaskById(taskId);
if (!task) {
  console.error('❌ Task not found');
  process.exit(1);
}

try {
  // Create repo
  console.log(`📦 Creating GitHub repo: peymanrah/${repoName}`);
  execSync(
    `gh repo create peymanrah/${repoName} --public --description "${desc}" --confirm`,
    { stdio: 'inherit' }
  );

  const repoUrl = `https://github.com/peymanrah/${repoName}`;

  // Update task with repo info
  updateTask(taskId, {
    githubRepo: repoUrl,
    branch: 'dev',
    logs: [
      ...task.logs,
      { timestamp: new Date().toISOString(), message: `GitHub repo created: ${repoUrl}` },
    ],
  });

  console.log(`✅ Repo created and linked to task: ${repoUrl}`);
} catch (err) {
  console.error('❌ Failed to create GitHub repo:', err);
  process.exit(1);
}

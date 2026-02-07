#!/usr/bin/env node
/**
 * Task Manager Control Tower — MCP Server
 *
 * This MCP (Model Context Protocol) server exposes task management tools
 * that any VS Code Copilot agent can call from ANY window/workspace.
 *
 * It directly reads/writes the task data files, so the HTTP server does NOT
 * need to be running (though the UI won't show changes until the server is up).
 *
 * Configure globally in VS Code so every workspace sees these tools:
 *   Settings → MCP → or .vscode/mcp.json
 */

const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { z } = require('zod');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// ─── Data paths (same as taskStore.ts) ───────────────────────────────────────

const DATA_DIR = path.resolve(__dirname, 'data');
const TASKS_FILE = path.join(DATA_DIR, 'tasks.json');
const SPECS_DIR = path.join(DATA_DIR, 'specs');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(TASKS_FILE)) fs.writeFileSync(TASKS_FILE, '[]', 'utf-8');
  if (!fs.existsSync(SPECS_DIR)) fs.mkdirSync(SPECS_DIR, { recursive: true });
}

function readTasks() {
  ensureDataDir();
  try { return JSON.parse(fs.readFileSync(TASKS_FILE, 'utf-8')); }
  catch { return []; }
}

function writeTasks(tasks) {
  ensureDataDir();
  fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2), 'utf-8');
}

function now() { return new Date().toISOString(); }

// ─── Create MCP Server ──────────────────────────────────────────────────────

const server = new McpServer({
  name: 'task-manager-control-tower',
  version: '1.0.0',
});

// ─── Tool: list_tasks ────────────────────────────────────────────────────────

server.tool(
  'list_tasks',
  'List all tasks in the Control Tower. Returns task IDs, titles, status, progress, subtask counts, and timestamps.',
  {},
  async () => {
    const tasks = readTasks();
    const summary = tasks.map(t => ({
      id: t.id,
      title: t.title,
      description: t.description,
      status: t.status,
      progress: t.progress,
      subtasks: `${t.subtasks.filter(s => s.status === 'done').length}/${t.subtasks.length}`,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }));
    return { content: [{ type: 'text', text: JSON.stringify(summary, null, 2) }] };
  }
);

// ─── Tool: get_task ──────────────────────────────────────────────────────────

server.tool(
  'get_task',
  'Get full details of a specific task by ID, including all subtasks, logs, and metadata.',
  { taskId: z.string().describe('The UUID of the task to retrieve') },
  async ({ taskId }) => {
    const tasks = readTasks();
    const task = tasks.find(t => t.id === taskId);
    if (!task) return { content: [{ type: 'text', text: `Error: Task ${taskId} not found` }] };
    return { content: [{ type: 'text', text: JSON.stringify(task, null, 2) }] };
  }
);

// ─── Tool: create_task ───────────────────────────────────────────────────────

server.tool(
  'create_task',
  'Create a new task in the Control Tower. Returns the created task with its ID. Use this when a user asks to track work in the task manager.',
  {
    title: z.string().describe('Task title — concise summary of the work'),
    description: z.string().optional().describe('Detailed task description'),
    githubRepo: z.string().optional().describe('GitHub repository URL'),
    branch: z.string().optional().describe('Git branch name'),
  },
  async ({ title, description, githubRepo, branch }) => {
    const tasks = readTasks();
    const task = {
      id: uuidv4(),
      title,
      description: description || '',
      status: 'pending',
      progress: 0,
      subtasks: [],
      githubRepo: githubRepo || '',
      branch: branch || '',
      prUrl: '',
      associatedFiles: [],
      createdAt: now(),
      updatedAt: now(),
      logs: [{ timestamp: now(), message: `Task created: ${title}` }],
    };
    tasks.push(task);
    writeTasks(tasks);
    return { content: [{ type: 'text', text: `✅ Task created!\n\n${JSON.stringify(task, null, 2)}` }] };
  }
);

// ─── Tool: update_task ───────────────────────────────────────────────────────

server.tool(
  'update_task',
  'Update an existing task. Can change status, progress, description, GitHub links, etc.',
  {
    taskId: z.string().describe('The UUID of the task to update'),
    status: z.enum(['pending', 'in-progress', 'done', 'failed', 'blocked']).optional().describe('New task status'),
    progress: z.number().min(0).max(100).optional().describe('Progress percentage 0-100'),
    description: z.string().optional().describe('Updated description'),
    title: z.string().optional().describe('Updated title'),
    githubRepo: z.string().optional().describe('GitHub repo URL'),
    branch: z.string().optional().describe('Git branch name'),
    prUrl: z.string().optional().describe('Pull request URL'),
  },
  async ({ taskId, ...updates }) => {
    const tasks = readTasks();
    const idx = tasks.findIndex(t => t.id === taskId);
    if (idx === -1) return { content: [{ type: 'text', text: `Error: Task ${taskId} not found` }] };

    // Apply only provided fields
    const filtered = Object.fromEntries(Object.entries(updates).filter(([_, v]) => v !== undefined));
    tasks[idx] = { ...tasks[idx], ...filtered, updatedAt: now() };

    // Auto-compute from subtasks
    if (tasks[idx].subtasks.length > 0) {
      const total = tasks[idx].subtasks.length;
      const doneCount = tasks[idx].subtasks.filter(s => s.status === 'done').length;
      tasks[idx].progress = Math.round((doneCount / total) * 100);
    }

    writeTasks(tasks);
    return { content: [{ type: 'text', text: `✅ Task updated!\n\n${JSON.stringify(tasks[idx], null, 2)}` }] };
  }
);

// ─── Tool: add_subtask ───────────────────────────────────────────────────────

server.tool(
  'add_subtask',
  'Add a subtask to an existing task. Subtasks help break down work into trackable pieces.',
  {
    taskId: z.string().describe('Parent task UUID'),
    title: z.string().describe('Subtask title'),
  },
  async ({ taskId, title }) => {
    const tasks = readTasks();
    const idx = tasks.findIndex(t => t.id === taskId);
    if (idx === -1) return { content: [{ type: 'text', text: `Error: Task ${taskId} not found` }] };

    const subtask = {
      id: uuidv4(),
      title,
      status: 'pending',
      progress: 0,
      logs: [{ timestamp: now(), message: `Subtask created: ${title}` }],
      createdAt: now(),
      updatedAt: now(),
    };

    tasks[idx].subtasks.push(subtask);
    tasks[idx].updatedAt = now();
    writeTasks(tasks);
    return { content: [{ type: 'text', text: `✅ Subtask added!\n\nID: ${subtask.id}\nTitle: ${subtask.title}\nParent: ${tasks[idx].title}` }] };
  }
);

// ─── Tool: update_subtask ────────────────────────────────────────────────────

server.tool(
  'update_subtask',
  'Update a subtask status or progress. This auto-recomputes the parent task progress.',
  {
    taskId: z.string().describe('Parent task UUID'),
    subtaskId: z.string().describe('Subtask UUID'),
    status: z.enum(['pending', 'in-progress', 'done', 'failed', 'blocked']).optional().describe('New subtask status'),
    progress: z.number().min(0).max(100).optional().describe('Subtask progress 0-100'),
  },
  async ({ taskId, subtaskId, status, progress }) => {
    const tasks = readTasks();
    const taskIdx = tasks.findIndex(t => t.id === taskId);
    if (taskIdx === -1) return { content: [{ type: 'text', text: `Error: Task ${taskId} not found` }] };

    const subIdx = tasks[taskIdx].subtasks.findIndex(s => s.id === subtaskId);
    if (subIdx === -1) return { content: [{ type: 'text', text: `Error: Subtask ${subtaskId} not found` }] };

    if (status) tasks[taskIdx].subtasks[subIdx].status = status;
    if (progress !== undefined) tasks[taskIdx].subtasks[subIdx].progress = progress;
    tasks[taskIdx].subtasks[subIdx].updatedAt = now();

    // Recompute parent progress
    const total = tasks[taskIdx].subtasks.length;
    const doneCount = tasks[taskIdx].subtasks.filter(s => s.status === 'done').length;
    tasks[taskIdx].progress = Math.round((doneCount / total) * 100);
    tasks[taskIdx].updatedAt = now();

    if (tasks[taskIdx].progress === 100 && tasks[taskIdx].status === 'in-progress') {
      tasks[taskIdx].status = 'done';
    }

    writeTasks(tasks);
    return { content: [{ type: 'text', text: `✅ Subtask updated! Parent progress: ${tasks[taskIdx].progress}%` }] };
  }
);

// ─── Tool: log_task ──────────────────────────────────────────────────────────

server.tool(
  'log_task',
  'Append a log/activity entry to a task. Use this to record progress updates, decisions, or notes.',
  {
    taskId: z.string().describe('Task UUID'),
    message: z.string().describe('Log message to append'),
    subtaskId: z.string().optional().describe('Optional subtask UUID to log against'),
  },
  async ({ taskId, message, subtaskId }) => {
    const tasks = readTasks();
    const taskIdx = tasks.findIndex(t => t.id === taskId);
    if (taskIdx === -1) return { content: [{ type: 'text', text: `Error: Task ${taskId} not found` }] };

    const entry = { timestamp: now(), message };

    if (subtaskId) {
      const subIdx = tasks[taskIdx].subtasks.findIndex(s => s.id === subtaskId);
      if (subIdx === -1) return { content: [{ type: 'text', text: `Error: Subtask ${subtaskId} not found` }] };
      tasks[taskIdx].subtasks[subIdx].logs.push(entry);
      tasks[taskIdx].subtasks[subIdx].updatedAt = now();
    } else {
      tasks[taskIdx].logs.push(entry);
    }

    tasks[taskIdx].updatedAt = now();
    writeTasks(tasks);
    return { content: [{ type: 'text', text: `✅ Log entry added to task "${tasks[taskIdx].title}"` }] };
  }
);

// ─── Tool: get_spec ──────────────────────────────────────────────────────────

server.tool(
  'get_spec',
  'Get the spec/requirements document for a task. Specs contain planning, checklists, and considerations in Markdown.',
  { taskId: z.string().describe('Task UUID') },
  async ({ taskId }) => {
    ensureDataDir();
    const specPath = path.join(SPECS_DIR, `${taskId}.md`);
    if (!fs.existsSync(specPath)) {
      return { content: [{ type: 'text', text: 'No spec exists for this task yet.' }] };
    }
    const content = fs.readFileSync(specPath, 'utf-8');
    return { content: [{ type: 'text', text: content }] };
  }
);

// ─── Tool: update_spec ───────────────────────────────────────────────────────

server.tool(
  'update_spec',
  'Create or update the spec/requirements document for a task. Write Markdown with planning, checklists, rules, and considerations.',
  {
    taskId: z.string().describe('Task UUID'),
    content: z.string().describe('Full Markdown content for the spec document'),
  },
  async ({ taskId, content }) => {
    ensureDataDir();
    const tasks = readTasks();
    const task = tasks.find(t => t.id === taskId);
    if (!task) return { content: [{ type: 'text', text: `Error: Task ${taskId} not found` }] };

    const specPath = path.join(SPECS_DIR, `${taskId}.md`);
    fs.writeFileSync(specPath, content, 'utf-8');
    return { content: [{ type: 'text', text: `✅ Spec updated for task "${task.title}"` }] };
  }
);

// ─── Tool: delete_task ───────────────────────────────────────────────────────

server.tool(
  'delete_task',
  'Delete a task and its spec document permanently.',
  { taskId: z.string().describe('Task UUID to delete') },
  async ({ taskId }) => {
    const tasks = readTasks();
    const idx = tasks.findIndex(t => t.id === taskId);
    if (idx === -1) return { content: [{ type: 'text', text: `Error: Task ${taskId} not found` }] };

    const title = tasks[idx].title;
    tasks.splice(idx, 1);
    writeTasks(tasks);

    // Also delete spec
    const specPath = path.join(SPECS_DIR, `${taskId}.md`);
    if (fs.existsSync(specPath)) fs.unlinkSync(specPath);

    return { content: [{ type: 'text', text: `✅ Task "${title}" deleted.` }] };
  }
);

// ─── Tool: get_lessons_learned ────────────────────────────────────────────────

server.tool(
  'get_lessons_learned',
  'Aggregate all lessons learned across every task spec. Returns a unified view of what worked and what did not across all projects. Use this for AI personalization — understanding user preferences, patterns, and pitfalls before starting new work.',
  {},
  async () => {
    ensureDataDir();
    const tasks = readTasks();
    const allLessons = [];

    for (const task of tasks) {
      const specPath = path.join(SPECS_DIR, `${task.id}.md`);
      if (!fs.existsSync(specPath)) continue;
      const spec = fs.readFileSync(specPath, 'utf-8');

      // Extract lessons learned sections
      const workedMatch = spec.match(/## ✅ What Worked\n([\s\S]*?)(?=\n## |$)/);
      const didntMatch = spec.match(/## ❌ What Didn't Work\n([\s\S]*?)(?=\n## |$)/);
      const patternsMatch = spec.match(/## 🧠 AI Agent Notes\n([\s\S]*?)(?=\n## |$)/);

      if (workedMatch || didntMatch || patternsMatch) {
        allLessons.push({
          taskId: task.id,
          taskTitle: task.title,
          status: task.status,
          whatWorked: workedMatch ? workedMatch[1].trim() : '',
          whatDidntWork: didntMatch ? didntMatch[1].trim() : '',
          aiAgentNotes: patternsMatch ? patternsMatch[1].trim() : '',
        });
      }
    }

    if (allLessons.length === 0) {
      return { content: [{ type: 'text', text: 'No lessons learned recorded yet across any tasks. Add "## ✅ What Worked", "## ❌ What Didn\'t Work", and "## 🧠 AI Agent Notes" sections to task specs.' }] };
    }

    let report = '# 🧠 Lessons Learned Across All Tasks\n\n';
    report += `_${allLessons.length} task(s) with lessons recorded_\n\n`;

    for (const l of allLessons) {
      report += `---\n### ${l.taskTitle} (${l.status})\n\n`;
      if (l.whatWorked) report += `**✅ What Worked:**\n${l.whatWorked}\n\n`;
      if (l.whatDidntWork) report += `**❌ What Didn't Work:**\n${l.whatDidntWork}\n\n`;
      if (l.aiAgentNotes) report += `**🧠 AI Agent Notes:**\n${l.aiAgentNotes}\n\n`;
    }

    return { content: [{ type: 'text', text: report }] };
  }
);

// ─── Tool: export_specs ──────────────────────────────────────────────────────

server.tool(
  'export_specs',
  'Export all task data and specs as a single JSON bundle. Use for backup, migration, or sharing across machines. Includes tasks, subtasks, logs, and full spec Markdown.',
  {},
  async () => {
    ensureDataDir();
    const tasks = readTasks();
    const bundle = {
      exportedAt: now(),
      version: '1.0.0',
      tasks: tasks.map(t => {
        const specPath = path.join(SPECS_DIR, `${t.id}.md`);
        const spec = fs.existsSync(specPath) ? fs.readFileSync(specPath, 'utf-8') : '';
        return { ...t, spec };
      }),
    };
    return { content: [{ type: 'text', text: JSON.stringify(bundle, null, 2) }] };
  }
);

// ─── Tool: import_specs ──────────────────────────────────────────────────────

server.tool(
  'import_specs',
  'Import tasks and specs from a JSON bundle (as produced by export_specs). Merges with existing data — tasks with matching IDs are updated, new IDs are added.',
  {
    bundle: z.string().describe('JSON string of the export bundle containing tasks and specs'),
  },
  async ({ bundle }) => {
    ensureDataDir();
    let parsed;
    try { parsed = JSON.parse(bundle); }
    catch { return { content: [{ type: 'text', text: 'Error: Invalid JSON bundle' }] }; }

    if (!parsed.tasks || !Array.isArray(parsed.tasks)) {
      return { content: [{ type: 'text', text: 'Error: Bundle must contain a "tasks" array' }] };
    }

    const existing = readTasks();
    let added = 0, updated = 0, specsWritten = 0;

    for (const importedTask of parsed.tasks) {
      const { spec, ...taskData } = importedTask;
      const existIdx = existing.findIndex(t => t.id === taskData.id);

      if (existIdx >= 0) {
        existing[existIdx] = { ...existing[existIdx], ...taskData, updatedAt: now() };
        updated++;
      } else {
        existing.push(taskData);
        added++;
      }

      if (spec) {
        const specPath = path.join(SPECS_DIR, `${taskData.id}.md`);
        fs.writeFileSync(specPath, spec, 'utf-8');
        specsWritten++;
      }
    }

    writeTasks(existing);
    return { content: [{ type: 'text', text: `✅ Import complete! Added: ${added}, Updated: ${updated}, Specs written: ${specsWritten}` }] };
  }
);

// ─── Start Server ────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Server is now running on stdio — VS Code will communicate via stdin/stdout
}

main().catch((err) => {
  console.error('MCP Server error:', err);
  process.exit(1);
});

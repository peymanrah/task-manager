# 🗼 Task Manager Control Tower

**An AI-native task management system for VS Code** — track tasks, subtasks, progress, specs, and lessons learned across every project, from any VS Code window, powered by [Model Context Protocol (MCP)](https://modelcontextprotocol.io).

![License](https://img.shields.io/badge/license-MIT-blue)
![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)
![MCP](https://img.shields.io/badge/MCP-1.26-purple)

---

## Why This Exists

When working with AI coding agents (GitHub Copilot, Claude, etc.) across multiple projects and VS Code windows, there's no persistent memory of:

- What tasks are you working on?
- What's the plan, checklist, and requirements for each?
- What worked and what didn't in past projects?
- How should the agent personalize its behavior for you?

**Control Tower solves this.** It gives your AI agent a **persistent brain** — a set of MCP tools that work in any VS Code window, backed by a real-time web dashboard.

---

## Architecture

```
┌────────────────────────────────────────────────────────┐
│                    VS Code Window A                     │
│  Copilot Chat ──► MCP Server (stdio) ──► data/         │
│                        │                   ├── tasks.json│
│                        │                   └── specs/   │
└────────────────────────│───────────────────────────────┘
                         │  (same files)
┌────────────────────────│───────────────────────────────┐
│                    VS Code Window B                     │
│  Copilot Chat ──► MCP Server (stdio) ──► data/         │
└────────────────────────────────────────────────────────┘
                         │
┌────────────────────────│───────────────────────────────┐
│              Control Tower Web UI (:4567)               │
│  Express + WebSocket ──► chokidar watches data/ ──►    │
│  React Dashboard (Cards / Timeline / Spec viewer)      │
└────────────────────────────────────────────────────────┘
```

| Layer | Technology |
|-------|-----------|
| **MCP Server** | `@modelcontextprotocol/sdk` 1.26, stdio transport |
| **Web Server** | Express 4.18, WebSocket (ws 8.16), chokidar 3.6 |
| **Dashboard** | React 18.2, Vite 5, Tailwind 3.4, lucide-react, react-markdown |
| **Data** | JSON file store + Markdown spec files |
| **Testing** | Jest 29.7 (30 tests) |
| **Runtime** | Node.js ≥ 18 |

---

## Features

### 📋 Task & Subtask Tracking
Create, update, and delete tasks with statuses (`pending`, `in-progress`, `done`, `failed`, `blocked`), subtask breakdowns, progress bars (auto-computed from subtasks), and activity logs.

### 📄 Spec Documents (per task)
Every task can have a **spec.md** — a Markdown document containing requirements, planning, checklists, architecture decisions, and considerations. Visible in the UI's **Spec tab**, rendered with full Markdown support (tables, code blocks, lists, etc.).

### 🧠 Lessons Learned & AI Personalization
Each spec includes structured sections that the AI agent reads before starting new work:

- **✅ What Worked** — techniques, tools, and patterns that succeeded
- **❌ What Didn't Work** — pitfalls, bugs, and anti-patterns to avoid
- **🧠 AI Agent Notes** — user preferences, environment quirks, behavioral guidance

The `get_lessons_learned` MCP tool aggregates these across **all** tasks, giving the agent a personalized knowledge base that grows over time.

### 📦 Export & Import
Export all tasks + specs as a single JSON bundle for backup or migration. Import bundles to restore or merge data across machines.

### 🕐 Timeline View
Chronological feed of all task events — creations, updates, subtask additions, logs — grouped by date with timestamps. Toggle between **Cards** and **Timeline** views.

### 🌓 Dark / Light Mode
Toggle between dark (default) and light themes. Persisted in `localStorage`.

### 🔗 GitHub Integration
Link tasks to repositories, branches, and pull requests. GitHub CLI (`gh`) integration for repo setup.

### ⚡ Real-time Updates
WebSocket push from server to UI on any data change. File watcher detects changes from CLI, MCP, or direct file edits.

---

## MCP Tools (13 total)

The MCP server exposes these tools to any VS Code Copilot agent:

| Tool | Description |
|------|-------------|
| `list_tasks` | List all tasks with status, progress, timestamps |
| `get_task` | Get full task details by ID |
| `create_task` | Create a new task (title, description, GitHub repo, branch) |
| `update_task` | Update task status, progress, description, GitHub links |
| `delete_task` | Delete a task and its spec |
| `add_subtask` | Add a subtask to a task |
| `update_subtask` | Update subtask status/progress (auto-recomputes parent) |
| `log_task` | Append activity log entry to a task |
| `get_spec` | Read a task's spec document |
| `update_spec` | Write/update a task's spec document |
| `get_lessons_learned` | Aggregate lessons from all task specs for AI personalization |
| `export_specs` | Export all tasks + specs as JSON bundle |
| `import_specs` | Import tasks + specs from JSON bundle |

---

## Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/peymanrah/task-manager.git
cd task-manager
npm install
```

### 2. Build the Dashboard

```bash
npm run build
```

### 3. Start the Server

```bash
npm start
```

Open http://localhost:4567 in your browser.

### 4. Configure MCP (Global — works in ALL VS Code windows)

Add to your VS Code **User Settings** (`settings.json`):

```json
{
  "mcp": {
    "servers": {
      "task-manager": {
        "type": "stdio",
        "command": "node",
        "args": ["/absolute/path/to/task-manager/mcp-server.js"]
      }
    }
  }
}
```

> **Important:** Use the absolute path to `mcp-server.js` on your machine.

Then reload VS Code (`Ctrl+Shift+P` → `Reload Window`).

### 5. Use It

In **any** VS Code Copilot chat, say:

> "Track this task in task manager"

The agent will call `create_task` automatically. Say:

> "List my tasks"

The agent calls `list_tasks` and shows your tasks.

---

## Spec Document Format

Every task spec follows this structure. The agent creates and updates these automatically:

```markdown
# Task Title — Spec

## Overview
What this task is about.

## Key Requirements
- [x] Requirement 1
- [ ] Requirement 2

## Planning
1. Step one
2. Step two

## Considerations
- Important notes, constraints, edge cases

## ✅ What Worked
- Technique or pattern that succeeded and why

## ❌ What Didn't Work
- Pitfall or bug encountered and the root cause

## 🧠 AI Agent Notes
- User preferences, environment quirks, behavioral reminders
- These notes carry forward to future tasks for personalization
```

The three lessons-learned sections (`✅ What Worked`, `❌ What Didn't Work`, `🧠 AI Agent Notes`) are **machine-parsed** by the `get_lessons_learned` tool and aggregated across all tasks.

---

## REST API

The web server exposes a REST API for programmatic access:

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/tasks` | List all tasks |
| `GET` | `/api/tasks/:id` | Get task by ID |
| `PATCH` | `/api/tasks/:id` | Update task fields |
| `DELETE` | `/api/tasks/:id` | Delete task |
| `DELETE` | `/api/tasks/:taskId/subtasks/:subtaskId` | Delete subtask |
| `GET` | `/api/tasks/:id/spec` | Get task spec |
| `PUT` | `/api/tasks/:id/spec` | Update task spec |
| `GET` | `/api/export` | Export all data as JSON bundle |
| `GET` | `/api/lessons` | Get aggregated lessons learned |

WebSocket on `ws://localhost:4567` pushes `FULL_STATE` messages on any data change.

---

## CLI Tools

```bash
# Create a task
npm run task:create -- --title "Build API" --desc "REST endpoints" --repo "https://github.com/user/repo"

# Update a task
npm run task:update -- --id <UUID> --status done --progress 100

# Add a log entry
npm run task:log -- --id <UUID> --message "Deployed to production"
```

---

## Project Structure

```
task-manager/
├── mcp-server.js          # MCP server (stdio) — 13 tools
├── start-server.ps1       # Auto-restart wrapper script
├── package.json           # Monorepo root (npm workspaces)
├── .vscode/
│   ├── mcp.json           # MCP config for this workspace
│   ├── tasks.json         # VS Code task for auto-start server
│   └── settings.json      # Auto-allow tasks
├── server/
│   ├── src/
│   │   ├── index.ts       # Express + WebSocket + API
│   │   ├── taskStore.ts   # Data layer (CRUD + specs)
│   │   └── cli/           # CLI tools
│   └── package.json
├── client/
│   ├── src/
│   │   ├── App.tsx        # Main app with view toggle
│   │   ├── components/
│   │   │   ├── Header.tsx    # Search, filters, theme, view toggle
│   │   │   ├── TaskCard.tsx  # Task card in grid view
│   │   │   ├── TaskDetail.tsx # Slide-in panel (Details + Spec tabs)
│   │   │   └── Timeline.tsx  # Chronological event feed
│   │   ├── hooks/
│   │   │   ├── useTaskStream.ts # WebSocket + REST data hook
│   │   │   └── useTheme.tsx     # Dark/light theme context
│   │   └── types.ts
│   └── package.json
└── data/
    ├── tasks.json         # Task data store
    └── specs/             # Per-task spec Markdown files
        ├── <task-id>.md
        └── ...
```

---

## How AI Personalization Works

```
┌──────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  New Task     │────►│  get_lessons     │────►│  Agent reads     │
│  starts in    │     │  _learned()      │     │  past lessons    │
│  any window   │     │  across ALL      │     │  and adapts      │
│               │     │  task specs      │     │  behavior        │
└──────────────┘     └──────────────────┘     └─────────────────┘
                                                      │
                            ┌──────────────────────────┘
                            ▼
                     ┌─────────────────┐
                     │  Task completes  │
                     │  Agent writes    │
                     │  lessons back    │
                     │  to spec.md     │
                     └─────────────────┘
```

1. **Before starting work**: Agent calls `get_lessons_learned` to load all past insights
2. **During work**: Agent updates the task spec with planning, checklists, decisions
3. **After completion**: Agent writes `✅ What Worked`, `❌ What Didn't Work`, and `🧠 AI Agent Notes`
4. **Next task**: The cycle repeats — each task benefits from all previous lessons

This creates a **compounding knowledge loop** where the agent gets smarter with every task.

---

## Export / Import

### Export (backup or migrate)
```bash
# Via API
curl http://localhost:4567/api/export > backup.json

# Via MCP (in Copilot chat)
# Say: "export all my tasks and specs"
```

### Import (restore or merge)
```
# Via MCP (in Copilot chat)
# Say: "import this task bundle" and provide the JSON
```

The import merges — existing task IDs are updated, new IDs are added. Specs are written for all imported tasks.

---

## Development

```bash
# Run in dev mode (hot reload)
npm run dev

# Run tests
npm test

# Build client
npm run build
```

### Testing
Tests are fully isolated from production data using the `TASK_MANAGER_DATA_FILE` environment variable. The test suite uses temporary directories and never touches `data/tasks.json`.

---

## Auto-Start Server

The server auto-starts when you open the workspace in VS Code:

1. `.vscode/tasks.json` defines a build task with `runOn: folderOpen`
2. `.vscode/settings.json` has `task.allowAutomaticTasks: "on"`
3. `start-server.ps1` wraps the server with auto-restart (50 retries)

---

## License

MIT

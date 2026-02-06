import { useState } from 'react';
import { useTaskStream } from './hooks/useTaskStream';
import { ThemeProvider } from './hooks/useTheme';
import Header from './components/Header';
import TaskCard from './components/TaskCard';
import TaskDetail from './components/TaskDetail';
import { Task, TaskStatus } from './types';

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

function AppContent() {
  const { tasks, connected, deleteTask, deleteSubtask } = useTaskStream();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [filter, setFilter] = useState<TaskStatus | 'all'>('all');
  const [search, setSearch] = useState('');

  const filtered = tasks.filter((t) => {
    if (filter !== 'all' && t.status !== filter) return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const stats = {
    total: tasks.length,
    pending: tasks.filter((t) => t.status === 'pending').length,
    inProgress: tasks.filter((t) => t.status === 'in-progress').length,
    done: tasks.filter((t) => t.status === 'done').length,
    failed: tasks.filter((t) => t.status === 'failed').length,
  };

  // Keep selected task synced with live data
  const liveSelected = selectedTask
    ? tasks.find((t) => t.id === selectedTask.id) || null
    : null;

  return (
    <div className="min-h-screen bg-tower-bg transition-colors duration-200">
      <Header
        connected={connected}
        stats={stats}
        filter={filter}
        onFilterChange={setFilter}
        search={search}
        onSearchChange={setSearch}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-tower-muted">
            <div className="text-6xl mb-4">📋</div>
            <h2 className="text-xl font-semibold mb-2">No tasks yet</h2>
            <p className="text-sm text-center max-w-md">
              Tasks are created through the VS Code Copilot chat. Ask the agent to
              perform any task and it will appear here in real-time.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onClick={() => setSelectedTask(task)}
                onDelete={() => {
                  if (selectedTask?.id === task.id) setSelectedTask(null);
                  deleteTask(task.id);
                }}
              />
            ))}
          </div>
        )}
      </main>

      {liveSelected && (
        <TaskDetail
          task={liveSelected}
          onClose={() => setSelectedTask(null)}
          onDeleteSubtask={(subtaskId) => deleteSubtask(liveSelected.id, subtaskId)}
        />
      )}
    </div>
  );
}

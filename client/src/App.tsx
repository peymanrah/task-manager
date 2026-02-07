import { useState, useMemo } from 'react';
import { useTaskStream } from './hooks/useTaskStream';
import { ThemeProvider } from './hooks/useTheme';
import Header from './components/Header';
import TaskCard, { TOPIC_CONFIG, TOPIC_ICONS } from './components/TaskCard';
import TaskDetail from './components/TaskDetail';
import Timeline from './components/Timeline';
import { Task, TaskStatus, TaskTopic } from './types';

export type ViewMode = 'cards' | 'timeline';

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
  const [view, setView] = useState<ViewMode>('cards');

  const filtered = tasks.filter((t) => {
    if (filter !== 'all' && t.status !== filter) return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Group tasks by topic, sorted newest-first within each group
  const topicGroups = useMemo(() => {
    const groups: Record<string, Task[]> = {};
    const sorted = [...filtered].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    for (const task of sorted) {
      const topic = task.topic || 'other';
      if (!groups[topic]) groups[topic] = [];
      groups[topic].push(task);
    }
    // Sort topic keys by priority order
    const topicOrder: TaskTopic[] = ['coding', 'research', 'data-science', 'evaluation', 'devops', 'conversation', 'other'];
    const ordered: [string, Task[]][] = topicOrder
      .filter(t => groups[t])
      .map(t => [t, groups[t]]);
    return ordered;
  }, [filtered]);

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
        view={view}
        onViewChange={setView}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {view === 'timeline' ? (
          <Timeline tasks={tasks} onTaskClick={setSelectedTask} />
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-tower-muted">
            <div className="text-6xl mb-4">📋</div>
            <h2 className="text-xl font-semibold mb-2">No tasks yet</h2>
            <p className="text-sm text-center max-w-md">
              Tasks are created through the VS Code Copilot chat. Ask the agent to
              perform any task and it will appear here in real-time.
            </p>
          </div>
        ) : (
          <div className="flex gap-6 overflow-x-auto pb-4">
            {topicGroups.map(([topic, topicTasks]) => {
              const cfg = TOPIC_CONFIG[topic as TaskTopic] || TOPIC_CONFIG.other;
              const IconComponent = TOPIC_ICONS[topic as TaskTopic] || TOPIC_ICONS.other;
              const colorClass = cfg.color.split(' ')[0];
              return (
                <div key={topic} className="flex-shrink-0 w-80">
                  {/* Column header */}
                  <div className={`flex items-center gap-2.5 mb-4 px-3 py-2.5 rounded-xl border border-tower-border/50 glass`}>
                    <div className={`flex items-center justify-center w-7 h-7 rounded-lg ${cfg.color.split(' ')[1]} ${colorClass}`}>
                      <IconComponent size={16} />
                    </div>
                    <span className={`text-sm font-semibold text-tower-text`}>
                      {cfg.label}
                    </span>
                    <span className="text-xs text-tower-muted ml-auto font-mono bg-tower-bg/50 px-2 py-0.5 rounded-full">{topicTasks.length}</span>
                  </div>
                  {/* Tasks */}
                  <div className="space-y-3">
                    {topicTasks.map((task) => (
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
                </div>
              );
            })}
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

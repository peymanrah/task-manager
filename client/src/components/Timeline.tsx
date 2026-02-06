import { useMemo } from 'react';
import {
  Clock,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  PlusCircle,
  RefreshCw,
  GitBranch,
} from 'lucide-react';
import { Task, TaskStatus } from '../types';

interface TimelineProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

interface TimelineEvent {
  id: string;
  taskId: string;
  taskTitle: string;
  type: 'created' | 'updated' | 'status-change' | 'subtask-added' | 'log';
  message: string;
  timestamp: string;
  status?: TaskStatus;
  task: Task;
}

const STATUS_ICON: Record<TaskStatus, React.ReactNode> = {
  pending: <Clock size={14} className="text-tower-warning" />,
  'in-progress': <Loader2 size={14} className="text-tower-info animate-spin" />,
  done: <CheckCircle2 size={14} className="text-tower-success" />,
  failed: <XCircle size={14} className="text-tower-danger" />,
  blocked: <AlertTriangle size={14} className="text-orange-400" />,
};

export default function Timeline({ tasks, onTaskClick }: TimelineProps) {
  const events = useMemo(() => {
    const all: TimelineEvent[] = [];

    for (const task of tasks) {
      // Task creation event
      all.push({
        id: `${task.id}-created`,
        taskId: task.id,
        taskTitle: task.title,
        type: 'created',
        message: `Task created`,
        timestamp: task.createdAt,
        status: task.status,
        task,
      });

      // Subtask creation events
      for (const sub of task.subtasks) {
        all.push({
          id: `${sub.id}-created`,
          taskId: task.id,
          taskTitle: task.title,
          type: 'subtask-added',
          message: `Subtask added: ${sub.title}`,
          timestamp: sub.createdAt,
          status: sub.status,
          task,
        });
      }

      // Log entries
      for (const log of task.logs) {
        // Skip the auto-generated "Task created:" log — we already have the creation event
        if (log.message.startsWith('Task created:')) continue;
        all.push({
          id: `${task.id}-log-${log.timestamp}`,
          taskId: task.id,
          taskTitle: task.title,
          type: 'log',
          message: log.message,
          timestamp: log.timestamp,
          task,
        });
      }

      // If updatedAt differs from createdAt significantly, show an update event
      if (task.updatedAt !== task.createdAt) {
        all.push({
          id: `${task.id}-updated`,
          taskId: task.id,
          taskTitle: task.title,
          type: 'updated',
          message: `Task updated — ${task.progress}% complete`,
          timestamp: task.updatedAt,
          status: task.status,
          task,
        });
      }
    }

    // Sort newest first
    all.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return all;
  }, [tasks]);

  // Group events by date
  const grouped = useMemo(() => {
    const groups: Map<string, TimelineEvent[]> = new Map();
    for (const event of events) {
      const dateKey = new Date(event.timestamp).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      if (!groups.has(dateKey)) groups.set(dateKey, []);
      groups.get(dateKey)!.push(event);
    }
    return groups;
  }, [events]);

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-tower-muted">
        <Clock size={48} className="mb-4 opacity-30" />
        <h2 className="text-xl font-semibold mb-2">No activity yet</h2>
        <p className="text-sm text-center max-w-md">
          Task events will appear here as they are created and updated.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {Array.from(grouped.entries()).map(([date, dayEvents]) => (
        <div key={date} className="mb-8">
          {/* Date header */}
          <div className="sticky top-[140px] z-10 mb-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-tower-card border border-tower-border text-xs font-medium text-tower-muted">
              <Clock size={12} />
              {date}
            </div>
          </div>

          {/* Events */}
          <div className="relative ml-4 pl-6 border-l-2 border-tower-border space-y-4">
            {dayEvents.map((event) => (
              <TimelineEventCard key={event.id} event={event} onClick={() => onTaskClick(event.task)} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function TimelineEventCard({ event, onClick }: { event: TimelineEvent; onClick: () => void }) {
  const icon = getEventIcon(event);
  const time = new Date(event.timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <div
      className="relative group cursor-pointer"
      onClick={onClick}
    >
      {/* Dot on the timeline */}
      <div className="absolute -left-[31px] top-2 w-4 h-4 rounded-full bg-tower-card border-2 border-tower-border
                      group-hover:border-tower-accent transition-colors flex items-center justify-center">
        <div className={`w-1.5 h-1.5 rounded-full ${getEventDotColor(event)}`} />
      </div>

      {/* Card */}
      <div className="glass rounded-lg p-3 hover:border-tower-accent/50 transition-all group-hover:shadow-lg group-hover:shadow-tower-accent/5">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">{icon}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-xs font-semibold text-tower-text truncate">{event.taskTitle}</span>
              {event.status && STATUS_ICON[event.status]}
            </div>
            <p className="text-xs text-tower-muted">{event.message}</p>
            <span className="text-[10px] text-tower-muted/60 mt-1 block">{time}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function getEventIcon(event: TimelineEvent): React.ReactNode {
  switch (event.type) {
    case 'created':
      return <PlusCircle size={16} className="text-tower-success" />;
    case 'updated':
      return <RefreshCw size={16} className="text-tower-info" />;
    case 'subtask-added':
      return <GitBranch size={16} className="text-tower-accent" />;
    case 'log':
      return <Clock size={16} className="text-tower-muted" />;
    default:
      return <Clock size={16} className="text-tower-muted" />;
  }
}

function getEventDotColor(event: TimelineEvent): string {
  switch (event.type) {
    case 'created':
      return 'bg-tower-success';
    case 'updated':
      return 'bg-tower-info';
    case 'subtask-added':
      return 'bg-tower-accent';
    case 'log':
      return 'bg-tower-muted';
    default:
      return 'bg-tower-muted';
  }
}

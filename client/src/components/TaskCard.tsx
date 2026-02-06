import {
  Clock,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  GitBranch,
  ExternalLink,
  Trash2,
  ChevronRight,
} from 'lucide-react';
import { Task, TaskStatus } from '../types';

interface TaskCardProps {
  task: Task;
  onClick: () => void;
  onDelete: () => void;
}

const STATUS_CONFIG: Record<
  TaskStatus,
  { icon: React.ReactNode; color: string; bg: string; label: string }
> = {
  pending: {
    icon: <Clock size={14} />,
    color: 'text-tower-warning',
    bg: 'bg-tower-warning/10',
    label: 'Pending',
  },
  'in-progress': {
    icon: <Loader2 size={14} className="animate-spin" />,
    color: 'text-tower-info',
    bg: 'bg-tower-info/10',
    label: 'In Progress',
  },
  done: {
    icon: <CheckCircle2 size={14} />,
    color: 'text-tower-success',
    bg: 'bg-tower-success/10',
    label: 'Done',
  },
  failed: {
    icon: <XCircle size={14} />,
    color: 'text-tower-danger',
    bg: 'bg-tower-danger/10',
    label: 'Failed',
  },
  blocked: {
    icon: <AlertTriangle size={14} />,
    color: 'text-orange-400',
    bg: 'bg-orange-400/10',
    label: 'Blocked',
  },
};

export default function TaskCard({ task, onClick, onDelete }: TaskCardProps) {
  const cfg = STATUS_CONFIG[task.status];
  const subtasksDone = task.subtasks.filter((s) => s.status === 'done').length;
  const subtasksTotal = task.subtasks.length;

  return (
    <div
      className="glass rounded-xl p-4 cursor-pointer hover:border-tower-accent/50
                 transition-all duration-200 hover:shadow-lg hover:shadow-tower-accent/5 group relative"
      onClick={onClick}
    >
      {/* Delete button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (confirm('Delete this task?')) onDelete();
        }}
        className="absolute top-3 right-3 p-1.5 rounded-lg text-tower-muted
                   opacity-0 group-hover:opacity-100 hover:bg-tower-danger/10
                   hover:text-tower-danger transition-all"
        title="Delete task"
      >
        <Trash2 size={14} />
      </button>

      {/* Status badge */}
      <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color} mb-3`}>
        {cfg.icon}
        {cfg.label}
      </div>

      {/* Title */}
      <h3 className="font-semibold text-sm text-white mb-1 pr-8 line-clamp-2">{task.title}</h3>

      {/* Description */}
      {task.description && (
        <p className="text-xs text-tower-muted mb-3 line-clamp-2">{task.description}</p>
      )}

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-[10px] text-tower-muted mb-1">
          <span>Progress</span>
          <span className="font-mono">{task.progress}%</span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-tower-bg overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              task.progress === 100
                ? 'bg-tower-success'
                : task.progress > 0
                ? 'bg-tower-accent'
                : 'bg-tower-border'
            }`}
            style={{ width: `${task.progress}%` }}
          />
        </div>
      </div>

      {/* Footer info */}
      <div className="flex items-center justify-between text-[10px] text-tower-muted">
        <div className="flex items-center gap-3">
          {subtasksTotal > 0 && (
            <span className="flex items-center gap-1">
              <CheckCircle2 size={10} />
              {subtasksDone}/{subtasksTotal} subtasks
            </span>
          )}
          {task.githubRepo && (
            <a
              href={task.githubRepo}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 hover:text-tower-accent transition-colors"
            >
              <GitBranch size={10} />
              Repo
              <ExternalLink size={8} />
            </a>
          )}
        </div>
        <ChevronRight size={14} className="text-tower-muted group-hover:text-tower-accent transition-colors" />
      </div>

      {/* Time */}
      <div className="mt-2 text-[10px] text-tower-muted/60">
        {new Date(task.updatedAt).toLocaleString()}
      </div>
    </div>
  );
}

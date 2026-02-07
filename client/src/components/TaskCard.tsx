import {
  Clock,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Github,
  ExternalLink,
  Trash2,
  ChevronRight,
  Code2,
  FlaskConical,
  BarChart3,
  ClipboardCheck,
  Server,
  MessageCircle,
  HelpCircle,
} from 'lucide-react';
import { Task, TaskStatus, TaskTopic } from '../types';

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

export const TOPIC_ICONS: Record<TaskTopic, React.FC<{ size?: number }>> = {
  coding: Code2,
  research: FlaskConical,
  'data-science': BarChart3,
  evaluation: ClipboardCheck,
  devops: Server,
  conversation: MessageCircle,
  other: HelpCircle,
};

const TOPIC_CONFIG: Record<TaskTopic, { icon: React.ReactNode; label: string; color: string }> = {
  coding: { icon: <Code2 size={12} />, label: 'Coding', color: 'text-blue-400 bg-blue-400/10' },
  research: { icon: <FlaskConical size={12} />, label: 'Research', color: 'text-purple-400 bg-purple-400/10' },
  'data-science': { icon: <BarChart3 size={12} />, label: 'Data Science', color: 'text-emerald-400 bg-emerald-400/10' },
  evaluation: { icon: <ClipboardCheck size={12} />, label: 'Evaluation', color: 'text-amber-400 bg-amber-400/10' },
  devops: { icon: <Server size={12} />, label: 'DevOps', color: 'text-cyan-400 bg-cyan-400/10' },
  conversation: { icon: <MessageCircle size={12} />, label: 'Conversation', color: 'text-pink-400 bg-pink-400/10' },
  other: { icon: <HelpCircle size={12} />, label: 'Other', color: 'text-gray-400 bg-gray-400/10' },
};

export { TOPIC_CONFIG };

export default function TaskCard({ task, onClick, onDelete }: TaskCardProps) {
  const cfg = STATUS_CONFIG[task.status];
  const topicCfg = TOPIC_CONFIG[task.topic || 'other'];
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

      {/* Status & Topic badges */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${cfg.bg} ${cfg.color}`}>
          {cfg.icon}
          {cfg.label}
        </div>
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${topicCfg.color}`}>
          {topicCfg.icon}
          {topicCfg.label}
        </div>
      </div>

      {/* Title */}
      <h3 className="font-semibold text-sm text-tower-text mb-1 pr-8 line-clamp-2">{task.title}</h3>

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
              title={task.githubRepo}
            >
              <Github size={12} />
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

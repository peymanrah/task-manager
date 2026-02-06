import {
  X,
  Clock,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  GitBranch,
  GitPullRequest,
  ExternalLink,
  FileText,
  Trash2,
  MessageSquare,
} from 'lucide-react';
import { Task, Subtask, TaskStatus, LogEntry } from '../types';

interface TaskDetailProps {
  task: Task;
  onClose: () => void;
  onDeleteSubtask: (subtaskId: string) => void;
}

const STATUS_ICON: Record<TaskStatus, React.ReactNode> = {
  pending: <Clock size={14} className="text-tower-warning" />,
  'in-progress': <Loader2 size={14} className="text-tower-info animate-spin" />,
  done: <CheckCircle2 size={14} className="text-tower-success" />,
  failed: <XCircle size={14} className="text-tower-danger" />,
  blocked: <AlertTriangle size={14} className="text-orange-400" />,
};

const STATUS_COLOR: Record<TaskStatus, string> = {
  pending: 'text-tower-warning',
  'in-progress': 'text-tower-info',
  done: 'text-tower-success',
  failed: 'text-tower-danger',
  blocked: 'text-orange-400',
};

export default function TaskDetail({ task, onClose, onDeleteSubtask }: TaskDetailProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-lg h-full bg-tower-card border-l border-tower-border
                      overflow-y-auto shadow-2xl animate-in slide-in-from-right">
        {/* Header */}
        <div className="sticky top-0 z-10 glass border-b border-tower-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {STATUS_ICON[task.status]}
              <span className={`text-xs font-semibold uppercase tracking-wider ${STATUS_COLOR[task.status]}`}>
                {task.status}
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-tower-border transition-colors"
            >
              <X size={16} />
            </button>
          </div>
          <h2 className="text-lg font-bold mt-2">{task.title}</h2>
          {task.description && (
            <p className="text-sm text-tower-muted mt-1">{task.description}</p>
          )}
        </div>

        <div className="px-6 py-4 space-y-6">
          {/* Progress */}
          <Section title="Progress">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 rounded-full bg-tower-bg overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    task.progress === 100 ? 'bg-tower-success' : 'bg-tower-accent'
                  }`}
                  style={{ width: `${task.progress}%` }}
                />
              </div>
              <span className="text-sm font-mono font-bold">{task.progress}%</span>
            </div>
          </Section>

          {/* GitHub */}
          {(task.githubRepo || task.prUrl || task.branch) && (
            <Section title="GitHub">
              <div className="space-y-2">
                {task.githubRepo && (
                  <LinkRow icon={<GitBranch size={14} />} label="Repository" href={task.githubRepo} />
                )}
                {task.branch && (
                  <div className="flex items-center gap-2 text-sm text-tower-muted">
                    <GitBranch size={14} />
                    <span>Branch:</span>
                    <code className="px-1.5 py-0.5 bg-tower-bg rounded text-xs font-mono text-tower-accent">
                      {task.branch}
                    </code>
                  </div>
                )}
                {task.prUrl && (
                  <LinkRow icon={<GitPullRequest size={14} />} label="Pull Request" href={task.prUrl} />
                )}
              </div>
            </Section>
          )}

          {/* Associated Files */}
          {task.associatedFiles.length > 0 && (
            <Section title="Files">
              <div className="space-y-1">
                {task.associatedFiles.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-tower-muted">
                    <FileText size={14} />
                    <span className="font-mono text-xs">{f}</span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Subtasks */}
          {task.subtasks.length > 0 && (
            <Section title={`Subtasks (${task.subtasks.filter((s) => s.status === 'done').length}/${task.subtasks.length})`}>
              <div className="space-y-2">
                {task.subtasks.map((sub) => (
                  <SubtaskRow
                    key={sub.id}
                    subtask={sub}
                    onDelete={() => {
                      if (confirm('Delete this subtask?')) onDeleteSubtask(sub.id);
                    }}
                  />
                ))}
              </div>
            </Section>
          )}

          {/* Activity Log */}
          {task.logs.length > 0 && (
            <Section title="Activity Log">
              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {[...task.logs].reverse().map((log, i) => (
                  <LogRow key={i} log={log} />
                ))}
              </div>
            </Section>
          )}

          {/* Metadata */}
          <Section title="Metadata">
            <div className="grid grid-cols-2 gap-2 text-xs text-tower-muted">
              <div>
                <span className="block text-tower-muted/60 mb-0.5">ID</span>
                <code className="font-mono text-[10px]">{task.id}</code>
              </div>
              <div>
                <span className="block text-tower-muted/60 mb-0.5">Created</span>
                {new Date(task.createdAt).toLocaleString()}
              </div>
              <div>
                <span className="block text-tower-muted/60 mb-0.5">Updated</span>
                {new Date(task.updatedAt).toLocaleString()}
              </div>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-tower-muted uppercase tracking-wider mb-2">{title}</h3>
      {children}
    </div>
  );
}

function LinkRow({ icon, label, href }: { icon: React.ReactNode; label: string; href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 text-sm text-tower-accent hover:text-tower-accent-hover transition-colors"
    >
      {icon}
      <span>{label}</span>
      <ExternalLink size={10} />
    </a>
  );
}

function SubtaskRow({ subtask, onDelete }: { subtask: Subtask; onDelete: () => void }) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-tower-bg/50 border border-tower-border/50 group">
      {STATUS_ICON[subtask.status]}
      <span className="flex-1 text-sm truncate">{subtask.title}</span>
      <span className="text-[10px] font-mono text-tower-muted">{subtask.progress}%</span>
      <button
        onClick={onDelete}
        className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-tower-danger/10
                   hover:text-tower-danger transition-all"
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
}

function LogRow({ log }: { log: LogEntry }) {
  return (
    <div className="flex gap-2">
      <div className="flex-shrink-0 mt-1">
        <MessageSquare size={12} className="text-tower-accent/50" />
      </div>
      <div>
        <p className="text-xs text-white/80">{log.message}</p>
        <span className="text-[10px] text-tower-muted/60">
          {new Date(log.timestamp).toLocaleString()}
        </span>
      </div>
    </div>
  );
}

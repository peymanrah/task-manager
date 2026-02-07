import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  X,
  Clock,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  GitBranch,
  Github,
  GitPullRequest,
  ExternalLink,
  FileText,
  Trash2,
  MessageSquare,
  BookOpen,
  LayoutList,
  Download,
  Upload,
} from 'lucide-react';
import { Task, Subtask, TaskStatus, LogEntry } from '../types';
import { TOPIC_CONFIG } from './TaskCard';

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

type Tab = 'details' | 'spec';

export default function TaskDetail({ task, onClose, onDeleteSubtask }: TaskDetailProps) {
  const [activeTab, setActiveTab] = useState<Tab>('details');
  const [spec, setSpec] = useState<string>('');
  const [specLoading, setSpecLoading] = useState(false);

  // Fetch spec when task changes or spec tab is shown
  useEffect(() => {
    setSpecLoading(true);
    fetch(`/api/tasks/${task.id}/spec`)
      .then((r) => r.json())
      .then((data) => {
        setSpec(data.spec || '');
        setSpecLoading(false);
      })
      .catch(() => setSpecLoading(false));
  }, [task.id, task.updatedAt]);

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
              {task.topic && (() => {
                const topicCfg = TOPIC_CONFIG[task.topic] || TOPIC_CONFIG.other;
                return (
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${topicCfg.color}`}>
                    {topicCfg.icon}
                    {topicCfg.label}
                  </div>
                );
              })()}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-tower-border transition-colors text-tower-text"
            >
              <X size={16} />
            </button>
          </div>
          <h2 className="text-lg font-bold mt-2 text-tower-text">{task.title}</h2>
          {task.description && (
            <p className="text-sm text-tower-muted mt-1">{task.description}</p>
          )}

          {/* Tabs */}
          <div className="flex gap-1 mt-3 -mb-4 pb-0">
            <TabButton
              active={activeTab === 'details'}
              onClick={() => setActiveTab('details')}
              icon={<LayoutList size={14} />}
              label="Details"
            />
            <TabButton
              active={activeTab === 'spec'}
              onClick={() => setActiveTab('spec')}
              icon={<BookOpen size={14} />}
              label="Spec"
              badge={spec ? '✓' : undefined}
            />
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'details' ? (
          <DetailsTab task={task} onDeleteSubtask={onDeleteSubtask} />
        ) : (
          <SpecTab spec={spec} loading={specLoading} taskTitle={task.title} taskId={task.id} onSpecImported={(s) => setSpec(s)} />
        )}
      </div>
    </div>
  );
}

// ─── Tab Button ──────────────────────────────────────────────────────────────

function TabButton({
  active,
  onClick,
  icon,
  label,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg transition-all border-b-2
        ${
          active
            ? 'border-tower-accent text-tower-accent bg-tower-accent/5'
            : 'border-transparent text-tower-muted hover:text-tower-text hover:bg-tower-border/30'
        }`}
    >
      {icon}
      {label}
      {badge && (
        <span className="ml-1 text-[9px] px-1 py-0.5 rounded bg-tower-success/20 text-tower-success">
          {badge}
        </span>
      )}
    </button>
  );
}

// ─── Details Tab ─────────────────────────────────────────────────────────────

function DetailsTab({ task, onDeleteSubtask }: { task: Task; onDeleteSubtask: (id: string) => void }) {
  return (
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
          <span className="text-sm font-mono font-bold text-tower-text">{task.progress}%</span>
        </div>
      </Section>

      {/* GitHub */}
      {(task.githubRepo || task.prUrl || task.branch) && (
        <Section title="GitHub">
          <div className="space-y-2">
            {task.githubRepo && (
              <LinkRow icon={<Github size={14} />} label="Repository" href={task.githubRepo} />
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
  );
}

// ─── Spec Tab ────────────────────────────────────────────────────────────────

function SpecTab({ spec, loading, taskTitle, taskId, onSpecImported }: {
  spec: string; loading: boolean; taskTitle: string; taskId: string; onSpecImported: (s: string) => void;
}) {
  const [importing, setImporting] = useState(false);

  const exportSpec = () => {
    const blob = new Blob([spec], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${taskTitle.replace(/[^a-zA-Z0-9-_ ]/g, '').replace(/\s+/g, '_')}_spec.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importSpec = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.md,.markdown,.txt';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setImporting(true);
      try {
        const text = await file.text();
        const merged = spec ? `${spec}\n\n---\n\n<!-- Imported from ${file.name} -->\n\n${text}` : text;
        await fetch(`/api/tasks/${taskId}/spec`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ spec: merged }),
        });
        onSpecImported(merged);
      } catch (err) {
        console.error('Failed to import spec:', err);
      } finally {
        setImporting(false);
      }
    };
    input.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-tower-accent" />
      </div>
    );
  }

  if (!spec) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-tower-muted px-6">
        <BookOpen size={40} className="mb-3 opacity-40" />
        <h3 className="text-sm font-semibold mb-1">No spec yet</h3>
        <p className="text-xs text-center max-w-xs mb-4">
          The spec document will be created automatically when the agent works on this task.
          It captures requirements, planning, checklists, and considerations.
        </p>
        <button
          onClick={importSpec}
          disabled={importing}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg
                     bg-tower-accent/10 text-tower-accent hover:bg-tower-accent/20 transition-colors
                     disabled:opacity-50"
        >
          {importing ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          Import .md
        </button>
      </div>
    );
  }

  return (
    <div className="px-6 py-4">
      <div className="flex justify-end gap-2 mb-3">
        <button
          onClick={importSpec}
          disabled={importing}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg
                     bg-tower-card border border-tower-border text-tower-muted
                     hover:border-tower-accent/50 hover:text-tower-accent transition-colors
                     disabled:opacity-50"
        >
          {importing ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          Import .md
        </button>
        <button
          onClick={exportSpec}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg
                     bg-tower-accent/10 text-tower-accent hover:bg-tower-accent/20 transition-colors"
        >
          <Download size={14} />
          Export .md
        </button>
      </div>
      <div className="spec-markdown text-tower-text">
        <ReactMarkdown>{spec}</ReactMarkdown>
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
      <span className="flex-1 text-sm truncate text-tower-text">{subtask.title}</span>
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
        <p className="text-xs text-tower-text/80">{log.message}</p>
        <span className="text-[10px] text-tower-muted/60">
          {new Date(log.timestamp).toLocaleString()}
        </span>
      </div>
    </div>
  );
}

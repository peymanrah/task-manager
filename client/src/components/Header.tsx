import {
  Wifi,
  WifiOff,
  ListChecks,
  Clock,
  Loader2,
  CheckCircle2,
  XCircle,
  Search,
} from 'lucide-react';
import { TaskStatus } from '../types';

interface HeaderProps {
  connected: boolean;
  stats: {
    total: number;
    pending: number;
    inProgress: number;
    done: number;
    failed: number;
  };
  filter: TaskStatus | 'all';
  onFilterChange: (f: TaskStatus | 'all') => void;
  search: string;
  onSearchChange: (s: string) => void;
}

const FILTERS: { label: string; value: TaskStatus | 'all'; icon: React.ReactNode }[] = [
  { label: 'All', value: 'all', icon: <ListChecks size={14} /> },
  { label: 'Pending', value: 'pending', icon: <Clock size={14} /> },
  { label: 'In Progress', value: 'in-progress', icon: <Loader2 size={14} className="animate-spin" /> },
  { label: 'Done', value: 'done', icon: <CheckCircle2 size={14} /> },
  { label: 'Failed', value: 'failed', icon: <XCircle size={14} /> },
];

export default function Header({
  connected,
  stats,
  filter,
  onFilterChange,
  search,
  onSearchChange,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 glass border-b border-tower-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top row */}
        <div className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-tower-accent/20 flex items-center justify-center">
              <span className="text-xl">🗼</span>
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Control Tower</h1>
              <p className="text-xs text-tower-muted">AI Agent Task Manager</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {/* Stats pills */}
            <div className="hidden sm:flex items-center gap-2">
              <StatPill label="Total" value={stats.total} color="text-white" />
              <StatPill label="Active" value={stats.inProgress} color="text-tower-info" />
              <StatPill label="Done" value={stats.done} color="text-tower-success" />
              <StatPill label="Failed" value={stats.failed} color="text-tower-danger" />
            </div>

            {/* Connection status */}
            <div
              className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
                connected
                  ? 'bg-tower-success/10 text-tower-success'
                  : 'bg-tower-danger/10 text-tower-danger'
              }`}
            >
              {connected ? <Wifi size={12} /> : <WifiOff size={12} />}
              {connected ? 'Live' : 'Offline'}
            </div>
          </div>
        </div>

        {/* Bottom row: search + filters */}
        <div className="flex items-center gap-4 pb-3">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-tower-muted" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-sm bg-tower-bg border border-tower-border rounded-lg
                         placeholder-tower-muted focus:outline-none focus:border-tower-accent transition-colors"
            />
          </div>
          <div className="flex items-center gap-1">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => onFilterChange(f.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all
                  ${
                    filter === f.value
                      ? 'bg-tower-accent text-white shadow-lg shadow-tower-accent/25'
                      : 'text-tower-muted hover:text-white hover:bg-tower-card'
                  }`}
              >
                {f.icon}
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}

function StatPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-tower-card/50 border border-tower-border">
      <span className={`text-sm font-bold ${color}`}>{value}</span>
      <span className="text-[10px] text-tower-muted uppercase tracking-wider">{label}</span>
    </div>
  );
}

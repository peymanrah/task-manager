import { useState, useEffect, useRef } from 'react';
import {
  Wifi,
  WifiOff,
  ListChecks,
  Clock,
  Loader2,
  CheckCircle2,
  XCircle,
  Search,
  Sun,
  Moon,
  LayoutGrid,
  History,
  User,
} from 'lucide-react';
import { TaskStatus } from '../types';
import { ViewMode } from '../App';
import { useTheme } from '../hooks/useTheme';

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
  view: ViewMode;
  onViewChange: (v: ViewMode) => void;
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
  view,
  onViewChange,
}: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const [userInfo, setUserInfo] = useState<{ displayName: string; email: string } | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/user')
      .then(r => r.json())
      .then(data => setUserInfo(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowUserMenu(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

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
              <h1 className="text-lg font-bold tracking-tight text-tower-text">Control Tower</h1>
              <p className="text-xs text-tower-muted">AI Agent Task Manager</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Stats pills */}
            <div className="hidden sm:flex items-center gap-2">
              <StatPill label="Total" value={stats.total} color="text-tower-text" />
              <StatPill label="Active" value={stats.inProgress} color="text-tower-info" />
              <StatPill label="Done" value={stats.done} color="text-tower-success" />
              <StatPill label="Failed" value={stats.failed} color="text-tower-danger" />
            </div>

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-tower-card border border-tower-border
                         hover:border-tower-accent/50 transition-all text-tower-muted hover:text-tower-text"
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>

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

            {/* User avatar */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-tower-card border border-tower-border
                           hover:border-tower-accent/50 transition-all"
                title={userInfo?.displayName || 'User'}
              >
                <div className="w-7 h-7 rounded-full bg-tower-accent/20 flex items-center justify-center flex-shrink-0">
                  {userInfo ? (
                    <span className="text-xs font-bold text-tower-accent uppercase">
                      {userInfo.displayName.split(' ').map(n => n[0]).join('')}
                    </span>
                  ) : (
                    <User size={14} className="text-tower-muted" />
                  )}
                </div>
                {userInfo && (
                  <span className="hidden sm:block text-sm font-medium text-tower-text">
                    {userInfo.displayName}
                  </span>
                )}
              </button>
              {showUserMenu && userInfo && (
                <div className="absolute right-0 top-full mt-2 w-64 glass rounded-xl border border-tower-border
                                shadow-2xl p-4 z-50">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-tower-accent/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-tower-accent uppercase">
                        {userInfo.displayName.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-tower-text truncate">{userInfo.displayName}</p>
                      <p className="text-xs text-tower-muted truncate">{userInfo.email}</p>
                    </div>
                  </div>
                </div>
              )}
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
                         text-tower-text placeholder-tower-muted focus:outline-none focus:border-tower-accent transition-colors"
            />
          </div>

          {/* View toggle */}
          <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-tower-bg border border-tower-border">
            <button
              onClick={() => onViewChange('cards')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-all
                ${view === 'cards'
                  ? 'bg-tower-accent text-white shadow-sm'
                  : 'text-tower-muted hover:text-tower-text'
                }`}
              title="Card view"
            >
              <LayoutGrid size={13} />
              Cards
            </button>
            <button
              onClick={() => onViewChange('timeline')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-all
                ${view === 'timeline'
                  ? 'bg-tower-accent text-white shadow-sm'
                  : 'text-tower-muted hover:text-tower-text'
                }`}
              title="Timeline view"
            >
              <History size={13} />
              Timeline
            </button>
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
                      : 'text-tower-muted hover:text-tower-text hover:bg-tower-card'
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

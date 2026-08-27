import React, { useState, useEffect } from 'react';
import { Bug, BugStatus, BugPriority, BugSeverity } from '@triarc/shared-types';
import {
  AlertTriangle,
  Flame,
  AlertCircle,
  Clock,
  MessageSquare,
  Flag as FlagIcon,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';

interface TableViewProps {
  bugs: Bug[];
  onSelectBug: (bugId: number) => void;
  selectedBugId?: number | null;
}

export const TableView: React.FC<TableViewProps> = ({
  bugs,
  onSelectBug,
  selectedBugId
}) => {
  const [focusedIndex, setFocusedIndex] = useState<number>(0);

  // Keyboard navigation (j/k, Enter)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex((prev) => Math.min(bugs.length - 1, prev + 1));
      } else if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex((prev) => Math.max(0, prev - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (bugs[focusedIndex]) {
          onSelectBug(bugs[focusedIndex].id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [bugs, focusedIndex, onSelectBug]);

  const getStatusBadge = (status: BugStatus) => {
    switch (status) {
      case 'Unconfirmed':
        return 'bg-slate-700/50 text-slate-300 border-slate-600/60';
      case 'Confirmed':
        return 'bg-sky-500/20 text-sky-300 border-sky-500/30';
      case 'In Progress':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm shadow-amber-500/10';
      case 'In Review':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-sm shadow-purple-500/10';
      case 'Resolved':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'Verified':
        return 'bg-teal-500/20 text-teal-300 border-teal-500/40';
      case 'Closed':
        return 'bg-slate-800 text-slate-400 border-slate-700';
      case 'Duplicate':
        return 'bg-zinc-800 text-zinc-400 border-zinc-700';
      case 'WontFix':
        return 'bg-rose-950/40 text-rose-300 border-rose-800/40';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const getSeverityIcon = (sev: BugSeverity) => {
    switch (sev) {
      case 'blocker':
        return (
          <span title="Blocker severity">
            <Flame className="w-3.5 h-3.5 text-rose-500" />
          </span>
        );
      case 'critical':
        return (
          <span title="Critical severity">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
          </span>
        );
      case 'major':
        return (
          <span title="Major severity">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
          </span>
        );
      default:
        return <span className="w-2 h-2 rounded-full bg-slate-600 inline-block" title="Normal" />;
    }
  };

  const getPriorityBadge = (prio: BugPriority) => {
    switch (prio) {
      case 'highest':
        return <span className="text-[10px] font-mono font-bold text-rose-400 bg-rose-500/10 px-1 py-0.2 rounded border border-rose-500/20">P0</span>;
      case 'high':
        return <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 px-1 py-0.2 rounded border border-amber-500/20">P1</span>;
      case 'normal':
        return <span className="text-[10px] font-mono text-slate-400 bg-slate-800/60 px-1 py-0.2 rounded border border-slate-700">P2</span>;
      default:
        return <span className="text-[10px] font-mono text-slate-500">P3</span>;
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-slate-800/90 bg-surface-50/80 backdrop-blur-sm shadow-xl">
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="border-b border-slate-800 bg-surface-100/90 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            <th className="py-2.5 px-3 w-16 text-center">ID</th>
            <th className="py-2.5 px-2 w-10 text-center">Sev</th>
            <th className="py-2.5 px-2 w-10 text-center">Prio</th>
            <th className="py-2.5 px-3">Title</th>
            <th className="py-2.5 px-3 w-28">Status</th>
            <th className="py-2.5 px-3 w-24">Component</th>
            <th className="py-2.5 px-3 w-36">Assignee</th>
            <th className="py-2.5 px-3 w-16 text-center">Comments</th>
            <th className="py-2.5 px-3 w-20 text-right">Updated</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60">
          {bugs.map((bug, index) => {
            const isFocused = index === focusedIndex;
            const isSelected = bug.id === selectedBugId;

            // Highlight bug #412 specifically for stalled visual
            const isBug412Stalled = bug.id === 412 && bug.status === 'In Review';

            return (
              <tr
                key={bug.id}
                onClick={() => onSelectBug(bug.id)}
                className={`group cursor-pointer transition-colors duration-150 ${
                  isSelected
                    ? 'bg-primary-950/40 border-l-4 border-l-primary-500'
                    : isFocused
                    ? 'bg-slate-800/40'
                    : 'hover:bg-surface-100/70'
                } ${isBug412Stalled ? 'bg-rose-950/15' : ''}`}
              >
                {/* ID */}
                <td className="py-2.5 px-3 text-center font-mono font-bold text-primary-400 whitespace-nowrap">
                  #{bug.id}
                </td>

                {/* Severity */}
                <td className="py-2.5 px-2 text-center">
                  <div className="flex justify-center">{getSeverityIcon(bug.severity)}</div>
                </td>

                {/* Priority */}
                <td className="py-2.5 px-2 text-center">
                  {getPriorityBadge(bug.priority)}
                </td>

                {/* Title + Stalled Indicator chip */}
                <td className="py-2.5 px-3 max-w-lg">
                  <div className="flex items-center gap-2">
                    {bug.security_group_id && (
                      <span className="p-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30" title="Confidential security bug">
                        <ShieldAlert className="w-3 h-3" />
                      </span>
                    )}
                    <span className="font-medium text-slate-200 group-hover:text-white truncate">
                      {bug.title}
                    </span>

                    {isBug412Stalled && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-stalled-bg text-stalled-text border border-stalled-border animate-pulse-subtle shadow-glow-stalled whitespace-nowrap">
                        <AlertTriangle className="w-2.5 h-2.5" />
                        Stalled 4d · Review
                      </span>
                    )}
                  </div>
                </td>

                {/* Status Badge */}
                <td className="py-2.5 px-3 whitespace-nowrap">
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium border ${getStatusBadge(bug.status)}`}>
                    {bug.status}
                  </span>
                </td>

                {/* Component */}
                <td className="py-2.5 px-3 whitespace-nowrap">
                  <span className="px-2 py-0.5 rounded bg-slate-800/80 text-slate-300 font-mono text-[10px] border border-slate-700">
                    {bug.component_id}
                  </span>
                </td>

                {/* Assignee */}
                <td className="py-2.5 px-3 whitespace-nowrap">
                  {bug.assignee ? (
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[9px] font-bold text-slate-300 overflow-hidden">
                        {bug.assignee.avatar_url ? (
                          <img src={bug.assignee.avatar_url} alt={bug.assignee.name} className="w-full h-full object-cover" />
                        ) : (
                          bug.assignee.name.charAt(0)
                        )}
                      </div>
                      <span className="text-slate-300 text-xs truncate max-w-[100px]">{bug.assignee.name}</span>
                    </div>
                  ) : (
                    <span className="text-slate-500 italic text-[11px]">Unassigned</span>
                  )}
                </td>

                {/* Comments count */}
                <td className="py-2.5 px-3 text-center text-slate-400">
                  {bug.comments_count ? (
                    <span className="inline-flex items-center gap-1 text-[11px]">
                      <MessageSquare className="w-3 h-3 text-slate-500" />
                      {bug.comments_count}
                    </span>
                  ) : (
                    <span className="text-slate-600">-</span>
                  )}
                </td>

                {/* Date */}
                <td className="py-2.5 px-3 text-right text-slate-400 font-mono text-[11px] whitespace-nowrap">
                  {formatDate(bug.updated_at || bug.created_at)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {bugs.length === 0 && (
        <div className="p-12 text-center text-slate-500 text-sm">
          No bugs found matching current filters.
        </div>
      )}
    </div>
  );
};

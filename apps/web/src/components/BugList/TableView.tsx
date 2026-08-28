import React, { useState, useEffect } from 'react';
import { Bug, BugStatus, BugPriority, BugSeverity } from '@triarc/shared-types';
import {
  AlertTriangle,
  Flame,
  AlertCircle,
  Clock,
  MessageSquare,
  ChevronRight,
  ShieldAlert,
  CheckSquare,
  Square,
  Activity as ActivityIcon,
  CheckCircle2,
  Loader2,
  ArrowRight
} from 'lucide-react';
import { bulkTransitionBugs } from '../../services/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';

interface TableViewProps {
  bugs: Bug[];
  onSelectBug: (bugId: number) => void;
  selectedBugId?: number | null;
  onBugsUpdated?: () => void;
}

export const TableView: React.FC<TableViewProps> = ({
  bugs,
  onSelectBug,
  selectedBugId,
  onBugsUpdated
}) => {
  const { currentUser } = useAuth();
  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  const [selectedBugIds, setSelectedBugIds] = useState<number[]>([]);
  const [bulkTargetState, setBulkTargetState] = useState<string>('In Progress');
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);
  const [bulkResultMsg, setBulkResultMsg] = useState<string | null>(null);

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

  const handleToggleSelect = (e: React.MouseEvent, bugId: number) => {
    e.stopPropagation();
    setSelectedBugIds((prev) =>
      prev.includes(bugId) ? prev.filter((id) => id !== bugId) : [...prev, bugId]
    );
  };

  const handleSelectAll = () => {
    if (selectedBugIds.length === bugs.length) {
      setSelectedBugIds([]);
    } else {
      setSelectedBugIds(bugs.map((b) => b.id));
    }
  };

  const handleBulkTransition = async () => {
    if (selectedBugIds.length === 0 || !bulkTargetState) return;
    setIsBulkSubmitting(true);
    setBulkResultMsg(null);

    try {
      const res = await bulkTransitionBugs(
        {
          bug_ids: selectedBugIds,
          toState: bulkTargetState,
          comment: `Bulk transition to ${bulkTargetState} via Triage Table`
        },
        currentUser?.id
      );

      setBulkResultMsg(`Updated ${res.success_count} of ${res.total} bugs to ${bulkTargetState}`);
      setSelectedBugIds([]);
      if (onBugsUpdated) onBugsUpdated();
    } catch (err: any) {
      setBulkResultMsg(`Bulk action failed: ${err.message}`);
    } finally {
      setIsBulkSubmitting(false);
    }
  };

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

  const renderSparkline = (sparkline?: number[]) => {
    if (!sparkline || sparkline.length === 0) return null;
    const max = Math.max(...sparkline, 1);

    return (
      <div className="flex items-end gap-0.5 h-3.5 w-14 shrink-0" title="14-day activity frequency">
        {sparkline.map((val, idx) => {
          const heightPct = Math.max(15, Math.round((val / max) * 100));
          return (
            <div
              key={idx}
              style={{ height: `${heightPct}%` }}
              className={`w-0.5 rounded-t transition-all ${
                val > 0 ? 'bg-primary-400' : 'bg-slate-800'
              }`}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {/* Floating Bulk Action Bar */}
      {selectedBugIds.length > 0 && (
        <div className="p-3 bg-surface-100/95 border border-primary-500/50 rounded-xl shadow-2xl backdrop-blur-md flex items-center justify-between gap-4 animate-slide-up flex-wrap">
          <div className="flex items-center gap-3">
            <span className="px-2 py-0.5 rounded bg-primary-600/30 text-primary-300 font-mono font-bold text-xs border border-primary-500/40">
              {selectedBugIds.length} Selected
            </span>
            <span className="text-xs text-slate-300">Bulk Workflow Action:</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={bulkTargetState}
              onChange={(e) => setBulkTargetState(e.target.value)}
              className="bg-surface-50 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-primary-500 font-medium"
            >
              <option value="Confirmed">Transition to Confirmed</option>
              <option value="In Progress">Transition to In Progress</option>
              <option value="In Review">Transition to In Review</option>
              <option value="Resolved">Transition to Resolved (FIXED)</option>
              <option value="Closed">Transition to Closed</option>
            </select>

            <button
              onClick={handleBulkTransition}
              disabled={isBulkSubmitting}
              className="px-3 py-1 rounded-lg bg-primary-600 hover:bg-primary-500 text-white font-semibold text-xs shadow-glow-primary flex items-center gap-1.5 disabled:opacity-50 transition-all"
            >
              {isBulkSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
              <span>Apply Transition</span>
            </button>

            <button
              onClick={() => setSelectedBugIds([])}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs transition-all"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {bulkResultMsg && (
        <div className="p-2.5 rounded-lg bg-primary-950/40 border border-primary-500/30 text-xs text-primary-200 flex items-center justify-between animate-fade-in">
          <span>{bulkResultMsg}</span>
          <button onClick={() => setBulkResultMsg(null)} className="text-slate-400 hover:text-white text-xs">✕</button>
        </div>
      )}

      {/* Main Table */}
      <div className="w-full overflow-x-auto rounded-xl border border-slate-800/90 bg-surface-50/80 backdrop-blur-sm shadow-xl">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-800 bg-surface-100/90 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <th className="py-2.5 px-3 w-8 text-center">
                <button
                  onClick={handleSelectAll}
                  className="text-slate-400 hover:text-white transition-colors"
                  title="Select all"
                >
                  {selectedBugIds.length === bugs.length && bugs.length > 0 ? (
                    <CheckSquare className="w-3.5 h-3.5 text-primary-400" />
                  ) : (
                    <Square className="w-3.5 h-3.5" />
                  )}
                </button>
              </th>
              <th className="py-2.5 px-2 w-14 text-center">ID</th>
              <th className="py-2.5 px-2 w-10 text-center">Sev</th>
              <th className="py-2.5 px-2 w-10 text-center">Prio</th>
              <th className="py-2.5 px-3">Title</th>
              <th className="py-2.5 px-3 w-28">Status</th>
              <th className="py-2.5 px-3 w-24">Component</th>
              <th className="py-2.5 px-3 w-32">Assignee</th>
              <th className="py-2.5 px-3 w-16 text-center">Activity</th>
              <th className="py-2.5 px-3 w-20 text-right">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {bugs.map((bug, index) => {
              const isFocused = index === focusedIndex;
              const isSelected = bug.id === selectedBugId;
              const isChecked = selectedBugIds.includes(bug.id);

              // Highlight bug #412 specifically for stalled visual
              const isBug412Stalled = bug.id === 412 && bug.status === 'In Review';
              const isSlaBreached = bug.sla_status?.is_breached;

              return (
                <tr
                  key={bug.id}
                  onClick={() => onSelectBug(bug.id)}
                  className={`group cursor-pointer transition-colors duration-150 ${
                    isSelected
                      ? 'bg-primary-950/40 border-l-4 border-l-primary-500'
                      : isChecked
                      ? 'bg-primary-950/20'
                      : isFocused
                      ? 'bg-slate-800/40'
                      : 'hover:bg-surface-100/70'
                  } ${isBug412Stalled ? 'bg-rose-950/15' : ''}`}
                >
                  {/* Select Checkbox */}
                  <td className="py-2.5 px-3 text-center" onClick={(e) => handleToggleSelect(e, bug.id)}>
                    {isChecked ? (
                      <CheckSquare className="w-3.5 h-3.5 text-primary-400 inline-block" />
                    ) : (
                      <Square className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 inline-block" />
                    )}
                  </td>

                  {/* ID */}
                  <td className="py-2.5 px-2 text-center font-mono font-bold text-primary-400 whitespace-nowrap">
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

                  {/* Title + Stalled / SLA Indicator chip */}
                  <td className="py-2.5 px-3 max-w-lg">
                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
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

                      {isSlaBreached && !isBug412Stalled && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 whitespace-nowrap">
                          SLA +{bug.sla_status?.breach_hours}h
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

                  {/* 14-day Activity Sparkline */}
                  <td className="py-2.5 px-3 text-center">
                    <div className="flex justify-center items-center">
                      {renderSparkline(bug.activity_sparkline)}
                    </div>
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
    </div>
  );
};

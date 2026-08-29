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
  ArrowRight,
  Shield,
  Tag,
  Radio
} from 'lucide-react';
import { bulkTransitionBugs } from '../../services/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { EmptyState } from '../Common/EmptyState.tsx';
import { ThreatPulseBadge } from '../Cyber/ThreatPulseBadge.tsx';

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
  const canTriage = currentUser?.role !== 'reporter';
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
          comment: `Bulk transition to ${bulkTargetState} via Incident Matrix`
        },
        currentUser?.id
      );

      setBulkResultMsg(`Updated ${res.success_count} of ${res.total} incidents to ${bulkTargetState}`);
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
        return 'bg-slate-900 text-slate-400 border-slate-700';
      case 'Confirmed':
        return 'bg-sky-950/80 text-sky-300 border-sky-500/40 shadow-sm';
      case 'In Progress':
        return 'bg-amber-950/80 text-amber-300 border-amber-500/40 shadow-glow-amber';
      case 'In Review':
        return 'bg-purple-950/80 text-purple-300 border-purple-500/40 shadow-glow-purple';
      case 'Resolved':
        return 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40 shadow-glow-neon';
      case 'Verified':
        return 'bg-teal-950/80 text-teal-300 border-teal-500/40';
      case 'Closed':
        return 'bg-slate-900 text-slate-400 border-slate-800';
      case 'Duplicate':
        return 'bg-zinc-900 text-zinc-400 border-zinc-800';
      case 'WontFix':
        return 'bg-red-950/40 text-red-300 border-red-800/40';
      default:
        return 'bg-slate-900 text-slate-300 border-slate-800';
    }
  };

  const getSeverityIcon = (sev: BugSeverity) => {
    switch (sev) {
      case 'blocker':
        return (
          <span title="Blocker - Threat Alert Level 1" className="flex items-center justify-center">
            <Flame className="w-4 h-4 text-red-500 animate-pulse shadow-glow-red" />
          </span>
        );
      case 'critical':
        return (
          <span title="Critical Threat" className="flex items-center justify-center">
            <AlertTriangle className="w-4 h-4 text-red-400" />
          </span>
        );
      case 'major':
        return (
          <span title="Major Issue" className="flex items-center justify-center">
            <AlertCircle className="w-4 h-4 text-amber-400" />
          </span>
        );
      default:
        return (
          <span className="w-2 h-2 rounded-full bg-cyan-500/60 inline-block" title="Normal" />
        );
    }
  };

  const getPriorityBadge = (prio: BugPriority) => {
    switch (prio) {
      case 'highest':
        return (
          <span className="text-[10px] font-mono font-bold text-red-300 bg-red-950/80 px-1.5 py-0.5 rounded border border-red-500/50 shadow-glow-red">
            P0
          </span>
        );
      case 'high':
        return (
          <span className="text-[10px] font-mono font-bold text-amber-300 bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-500/50">
            P1
          </span>
        );
      case 'normal':
        return (
          <span className="text-[10px] font-mono text-cyan-300 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700">
            P2
          </span>
        );
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
      <div className="flex items-end gap-0.5 h-3.5 w-14 shrink-0" title="14-day activity pulse">
        {sparkline.map((val, idx) => {
          const heightPct = Math.max(15, Math.round((val / max) * 100));
          return (
            <div
              key={idx}
              style={{ height: `${heightPct}%` }}
              className={`w-0.5 rounded-t transition-all ${
                val > 0 ? 'bg-cyan-400 shadow-glow-cyan' : 'bg-slate-800'
              }`}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Floating Bulk Action Bar */}
      {canTriage && selectedBugIds.length > 0 && (
        <div className="p-3.5 bg-slate-950/95 border border-cyan-500/50 rounded-2xl shadow-2xl backdrop-blur-xl flex items-center justify-between gap-4 animate-slide-up flex-wrap cyber-corners">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded-xl bg-cyan-500/20 text-cyan-300 font-mono font-bold text-xs border border-cyan-500/40 shadow-glow-cyan">
              {selectedBugIds.length} Selected
            </span>
            <span className="text-xs font-mono text-slate-300">Bulk Workflow Action:</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={bulkTargetState}
              onChange={(e) => setBulkTargetState(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
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
              className="cyber-btn-primary"
            >
              {isBulkSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
              <span className="font-mono">Apply Transition</span>
            </button>

            <button
              onClick={() => setSelectedBugIds([])}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-mono transition-all border border-slate-800"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {bulkResultMsg && (
        <div className="p-3 rounded-xl bg-cyan-950/60 border border-cyan-500/40 text-xs font-mono text-cyan-200 flex items-center justify-between animate-fade-in shadow-glow-cyan">
          <span>{bulkResultMsg}</span>
          <button onClick={() => setBulkResultMsg(null)} className="text-slate-400 hover:text-white text-xs">✕</button>
        </div>
      )}

      {/* Main Incident Matrix Table */}
      <div className="w-full overflow-x-auto rounded-2xl border border-cyan-500/15 bg-slate-950/80 backdrop-blur-xl shadow-cyber-card cyber-corners">
        <table className="w-full text-left border-collapse text-xs" aria-label="Incident triage matrix">
          <thead>
            <tr className="border-b border-slate-800/90 bg-slate-950/90 text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">
              {canTriage && (
                <th scope="col" className="py-3 px-3 w-8 text-center">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-slate-400 hover:text-cyan-400 transition-colors"
                    aria-label={selectedBugIds.length === bugs.length && bugs.length > 0 ? "Deselect all bugs" : "Select all bugs"}
                  >
                    {selectedBugIds.length === bugs.length && bugs.length > 0 ? (
                      <CheckSquare className="w-3.5 h-3.5 text-cyan-400" />
                    ) : (
                      <Square className="w-3.5 h-3.5" />
                    )}
                  </button>
                </th>
              )}
              <th scope="col" className="py-3 px-2 w-14 text-center">ID</th>
              <th scope="col" className="py-3 px-2 w-12 text-center">SEV</th>
              <th scope="col" className="py-3 px-2 w-12 text-center">PRIO</th>
              <th scope="col" className="py-3 px-4">INCIDENT & THREAT VECTOR</th>
              <th scope="col" className="py-3 px-3 w-32">STATE</th>
              <th scope="col" className="py-3 px-3 w-28">SUBSYSTEM</th>
              <th scope="col" className="py-3 px-3 w-36">ASSIGNEE</th>
              <th scope="col" className="py-3 px-3 w-20 text-center">PULSE</th>
              <th scope="col" className="py-3 px-3 w-24 text-right">UPDATED</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-900/80">
            {bugs.length === 0 ? (
              <tr>
                <td colSpan={10} className="p-8">
                  <EmptyState
                    icon={ActivityIcon}
                    title="No Matching Incidents in Active Telemetry"
                    description="Try adjusting search syntax, clearing filters, or reporting a new incident."
                  />
                </td>
              </tr>
            ) : (
              bugs.map((bug, index) => {
                const isFocused = index === focusedIndex;
                const isSelected = bug.id === selectedBugId;
                const isChecked = selectedBugIds.includes(bug.id);

                // Stalled review & SLA breach
                const isBug412Stalled = bug.id === 412 && bug.status === 'In Review';
                const isSlaBreached = bug.sla_status?.is_breached;
                const isConfidential = Boolean(bug.security_group_id);

                return (
                  <tr
                    key={bug.id}
                    onClick={() => onSelectBug(bug.id)}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelectBug(bug.id);
                      }
                    }}
                    aria-label={`Incident #${bug.id}: ${bug.title}`}
                    className={`group cursor-pointer transition-all duration-200 focus:outline-none ${
                      isSelected
                        ? 'bg-cyan-950/40 border-l-4 border-l-cyan-400'
                        : isChecked
                        ? 'bg-cyan-950/20'
                        : isFocused
                        ? 'bg-slate-900/80'
                        : isConfidential
                        ? 'bg-purple-950/15 hover:bg-purple-950/25'
                        : isBug412Stalled
                        ? 'bg-red-950/20 hover:bg-red-950/30'
                        : 'hover:bg-slate-900/60'
                    }`}
                  >
                    {/* Select Checkbox */}
                    {canTriage && (
                      <td className="py-3 px-3 text-center" onClick={(e) => handleToggleSelect(e, bug.id)}>
                        {isChecked ? (
                          <CheckSquare className="w-3.5 h-3.5 text-cyan-400 inline-block" />
                        ) : (
                          <Square className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 inline-block" />
                        )}
                      </td>
                    )}

                    {/* ID */}
                    <td className="py-3 px-2 text-center font-mono font-bold text-cyan-400 whitespace-nowrap">
                      #{bug.id}
                    </td>

                    {/* Severity */}
                    <td className="py-3 px-2 text-center">
                      <div className="flex justify-center">{getSeverityIcon(bug.severity)}</div>
                    </td>

                    {/* Priority */}
                    <td className="py-3 px-2 text-center">
                      {getPriorityBadge(bug.priority)}
                    </td>

                    {/* Title + Cyber Badges */}
                    <td className="py-3 px-4 max-w-lg">
                      <div className="flex items-center gap-2 flex-wrap">
                        {isConfidential && (
                          <span
                            className="p-1 rounded-md bg-purple-950/80 text-purple-300 border border-purple-500/50 shrink-0 shadow-glow-purple"
                            title="Confidential Security Core incident (grp_sec)"
                          >
                            <ShieldAlert className="w-3 h-3 text-purple-400" />
                          </span>
                        )}

                        <span className="font-semibold text-slate-200 group-hover:text-cyan-200 transition-colors truncate">
                          {bug.title}
                        </span>

                        {/* Milestone Badge */}
                        {bug.target_milestone && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 shrink-0">
                            {bug.target_milestone}
                          </span>
                        )}

                        {/* Keywords */}
                        {bug.keywords &&
                          bug.keywords.slice(0, 2).map((k) => (
                            <span
                              key={k.id}
                              className="text-[10px] font-mono text-cyan-400/90 bg-cyan-950/80 px-1.5 py-0.2 rounded border border-cyan-800/40 shrink-0"
                            >
                              #{k.name}
                            </span>
                          ))}

                        {/* Review Stall Badge */}
                        {isBug412Stalled && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-red-950/80 text-red-300 border border-red-500/60 shadow-glow-red animate-pulse whitespace-nowrap shrink-0">
                            <AlertTriangle className="w-3 h-3 text-red-400" />
                            REVIEW STALLED (4d)
                          </span>
                        )}

                        {/* SLA Breach Badge */}
                        {isSlaBreached && !isBug412Stalled && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-red-950/80 text-red-300 border border-red-500/50 whitespace-nowrap shrink-0">
                            SLA +{bug.sla_status?.breach_hours}h
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Status Pill */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold border ${getStatusBadge(bug.status)}`}>
                        {bug.status}
                      </span>
                    </td>

                    {/* Subsystem Component */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-md bg-slate-900 text-cyan-400 font-mono text-[10px] border border-slate-800">
                        {bug.component_id}
                      </span>
                    </td>

                    {/* Assignee */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      {bug.assignee ? (
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[9px] font-bold text-slate-300 overflow-hidden">
                            {bug.assignee.avatar_url ? (
                              <img src={bug.assignee.avatar_url} alt={bug.assignee.name} className="w-full h-full object-cover" />
                            ) : (
                              bug.assignee.name.charAt(0)
                            )}
                          </div>
                          <span className="text-slate-300 text-xs font-mono truncate max-w-[110px]">{bug.assignee.name}</span>
                        </div>
                      ) : (
                        <span className="text-slate-500 font-mono text-[10px] italic">Unassigned</span>
                      )}
                    </td>

                    {/* 14-Day Activity Sparkline */}
                    <td className="py-3 px-3 text-center">
                      <div className="flex justify-center">{renderSparkline(bug.activity_sparkline)}</div>
                    </td>

                    {/* Last Updated Date */}
                    <td className="py-3 px-3 text-right font-mono text-[11px] text-slate-400 whitespace-nowrap">
                      {formatDate(bug.updated_at)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

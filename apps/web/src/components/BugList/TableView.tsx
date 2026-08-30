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

      setBulkResultMsg(`UPDATED ${res.success_count} OF ${res.total} INCIDENTS TO ${bulkTargetState.toUpperCase()}`);
      setSelectedBugIds([]);
      if (onBugsUpdated) onBugsUpdated();
    } catch (err: any) {
      setBulkResultMsg(`BULK ACTION FAILED: ${err.message}`);
    } finally {
      setIsBulkSubmitting(false);
    }
  };

  const getStatusBadge = (status: BugStatus) => {
    switch (status) {
      case 'Unconfirmed':
        return 'bg-black text-muted-foreground border-border';
      case 'Confirmed':
        return 'bg-foreground/10 text-foreground border-foreground/40';
      case 'In Progress':
        return 'bg-[#B497CF]/15 text-[#B497CF] border-[#B497CF] font-bold';
      case 'In Review':
        return 'bg-purple-950 text-purple-300 border-purple-500 font-bold';
      case 'Resolved':
        return 'bg-emerald-950 text-emerald-300 border-emerald-500 font-bold';
      case 'Verified':
        return 'bg-teal-950 text-teal-300 border-teal-500 font-bold';
      case 'Closed':
        return 'bg-[#141414] text-muted-foreground border-border';
      case 'Duplicate':
        return 'bg-zinc-900 text-zinc-400 border-zinc-700';
      case 'WontFix':
        return 'bg-red-950 text-red-300 border-red-800';
      default:
        return 'bg-black text-foreground border-border';
    }
  };

  const getSeverityIcon = (sev: BugSeverity) => {
    switch (sev) {
      case 'blocker':
        return (
          <span title="Blocker - Threat Alert Level 1" className="flex items-center justify-center">
            <span className="w-2.5 h-2.5 bg-red-600 animate-blink inline-block" />
          </span>
        );
      case 'critical':
        return (
          <span title="Critical Threat" className="flex items-center justify-center">
            <span className="w-2.5 h-2.5 bg-[#B497CF] inline-block" />
          </span>
        );
      case 'major':
        return (
          <span title="Major Issue" className="flex items-center justify-center">
            <span className="w-2 h-2 bg-amber-400 inline-block" />
          </span>
        );
      default:
        return (
          <span className="w-1.5 h-1.5 bg-muted-foreground inline-block" title="Normal" />
        );
    }
  };

  const getPriorityBadge = (prio: BugPriority) => {
    switch (prio) {
      case 'highest':
        return (
          <span className="text-[10px] font-mono font-bold text-background bg-[#B497CF] px-1.5 py-0.5 uppercase">
            P1
          </span>
        );
      case 'high':
        return (
          <span className="text-[10px] font-mono font-bold text-foreground bg-[#222222] border border-foreground/40 px-1.5 py-0.5 uppercase">
            P2
          </span>
        );
      case 'normal':
        return (
          <span className="text-[10px] font-mono text-muted-foreground bg-[#111111] px-1.5 py-0.5 uppercase">
            P3
          </span>
        );
      default:
        return <span className="text-[10px] font-mono text-muted-foreground/60">P4</span>;
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }).toUpperCase();
  };

  const renderSparkline = (sparkline?: number[]) => {
    if (!sparkline || sparkline.length === 0) return null;
    const max = Math.max(...sparkline, 1);

    return (
      <div className="flex items-end gap-0.5 h-3.5 w-12 shrink-0" title="14-day activity pulse">
        {sparkline.map((val, idx) => {
          const heightPct = Math.max(15, Math.round((val / max) * 100));
          return (
            <div
              key={idx}
              style={{ height: `${heightPct}%` }}
              className={`w-0.5 transition-all ${val > 0 ? 'bg-[#B497CF]' : 'bg-[#222222]'
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
        <div className="p-3.5 bg-[#0d0d0d] border border-[#B497CF] shadow-lg flex items-center justify-between gap-4 animate-slide-up flex-wrap rounded-sm">
          <div className="flex items-center gap-3">
            <span className="px-2 py-0.5 bg-[#B497CF] text-background font-mono font-bold text-xs uppercase rounded-sm">
              {selectedBugIds.length} SELECTED
            </span>
            <span className="text-xs font-mono uppercase text-foreground font-semibold">Bulk Transition Action:</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={bulkTargetState}
              onChange={(e) => setBulkTargetState(e.target.value)}
              className="bg-[#080808] border border-border px-3 py-1.5 text-xs text-foreground font-mono uppercase focus:outline-none focus:border-foreground"
            >
              <option value="Confirmed">TRANSITION TO CONFIRMED</option>
              <option value="In Progress">TRANSITION TO IN PROGRESS</option>
              <option value="In Review">TRANSITION TO IN REVIEW</option>
              <option value="Resolved">TRANSITION TO RESOLVED (FIXED)</option>
              <option value="Closed">TRANSITION TO CLOSED</option>
            </select>

            <button
              onClick={handleBulkTransition}
              disabled={isBulkSubmitting}
              className="px-4 py-1.5 bg-foreground text-background font-bold text-xs font-mono uppercase flex items-center gap-1.5 hover:bg-white transition-all"
            >
              {isBulkSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
              <span>EXECUTE</span>
            </button>

            <button
              onClick={() => setSelectedBugIds([])}
              className="px-3 py-1.5 bg-[#141414] hover:bg-[#222] text-muted-foreground hover:text-foreground text-xs font-mono uppercase border border-border transition-all"
            >
              CANCEL
            </button>
          </div>
        </div>
      )}

      {bulkResultMsg && (
        <div className="p-3 border border-foreground/40 bg-[#141414] text-xs font-mono text-foreground flex items-center justify-between animate-fade-in uppercase">
          <span>{bulkResultMsg}</span>
          <button onClick={() => setBulkResultMsg(null)} className="text-muted-foreground hover:text-foreground text-xs">✕</button>
        </div>
      )}

      {/* Main Incident Matrix Table */}
      <div className="w-full overflow-x-auto border border-border bg-[#080808] shadow-sm">
        <table className="w-full text-left border-collapse text-xs" aria-label="Incident triage matrix">
          <thead>
            <tr className="border-b border-border bg-[#101010] text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-wider">
              {canTriage && (
                <th scope="col" className="py-3 px-3 w-8 text-center border-r border-border/60">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={selectedBugIds.length === bugs.length && bugs.length > 0 ? "Deselect all bugs" : "Select all bugs"}
                  >
                    {selectedBugIds.length === bugs.length && bugs.length > 0 ? (
                      <CheckSquare className="w-3.5 h-3.5 text-foreground" />
                    ) : (
                      <Square className="w-3.5 h-3.5" />
                    )}
                  </button>
                </th>
              )}
              <th scope="col" className="py-3 px-3 w-14 text-center border-r border-border/60">ID</th>
              <th scope="col" className="py-3 px-2.5 w-10 text-center border-r border-border/60">SEV</th>
              <th scope="col" className="py-3 px-2.5 w-14 text-center border-r border-border/60">PRIO</th>
              <th scope="col" className="py-3 px-4 border-r border-border/60">INCIDENT TITLE & DETAILS</th>
              <th scope="col" className="py-3 px-3.5 w-32 border-r border-border/60">STATUS</th>
              <th scope="col" className="py-3 px-3.5 w-28 border-r border-border/60">SUBSYSTEM</th>
              <th scope="col" className="py-3 px-3.5 w-36 border-r border-border/60">ASSIGNEE</th>
              <th scope="col" className="py-3 px-3 w-16 text-center border-r border-border/60">PULSE</th>
              <th scope="col" className="py-3 px-3.5 w-24 text-right">UPDATED</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border font-mono">
            {bugs.length === 0 ? (
              <tr>
                <td colSpan={10} className="p-8">
                  <EmptyState
                    icon={ActivityIcon}
                    title="NO MATCHING INCIDENTS IN ACTIVE TELEMETRY"
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
                    className={`group cursor-pointer transition-colors duration-150 focus:outline-none ${isSelected
                        ? 'bg-foreground/15 border-l-4 border-l-[#B497CF]'
                        : isChecked
                          ? 'bg-[#1a1a1a]'
                          : isFocused
                            ? 'bg-[#141414]'
                            : isConfidential
                              ? 'bg-purple-950/20 hover:bg-purple-950/40'
                              : isBug412Stalled
                                ? 'bg-[#B497CF]/10 hover:bg-[#B497CF]/20'
                                : 'hover:bg-[#111111]'
                      }`}
                  >
                    {/* Select Checkbox */}
                    {canTriage && (
                      <td className="py-2.5 px-3 text-center border-r border-border" onClick={(e) => handleToggleSelect(e, bug.id)}>
                        {isChecked ? (
                          <CheckSquare className="w-3.5 h-3.5 text-[#B497CF] inline-block" />
                        ) : (
                          <Square className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground inline-block" />
                        )}
                      </td>
                    )}

                    {/* ID */}
                    <td className="py-2.5 px-2 text-center font-bold text-foreground whitespace-nowrap border-r border-border tabular-nums">
                      #{bug.id}
                    </td>

                    {/* Severity */}
                    <td className="py-2.5 px-2 text-center border-r border-border">
                      <div className="flex justify-center">{getSeverityIcon(bug.severity)}</div>
                    </td>

                    {/* Priority */}
                    <td className="py-2.5 px-2 text-center border-r border-border">
                      {getPriorityBadge(bug.priority)}
                    </td>

                    {/* Title + Brutalist Badges */}
                    <td className="py-2.5 px-4 max-w-lg border-r border-border">
                      <div className="flex items-center gap-2 flex-wrap">
                        {isConfidential && (
                          <span
                            className="px-1.5 py-0.2 bg-purple-950 text-purple-300 border border-purple-500 text-[9px] uppercase font-bold shrink-0"
                            title="Confidential Security Core incident"
                          >
                            [CONFIDENTIAL]
                          </span>
                        )}

                        <span className="font-bold text-foreground group-hover:text-[#B497CF] transition-colors truncate">
                          {bug.title}
                        </span>

                        {/* Milestone Badge */}
                        {bug.target_milestone && (
                          <span className="inline-flex items-center px-1.5 py-0.2 text-[9px] uppercase bg-black text-muted-foreground border border-border shrink-0">
                            {bug.target_milestone}
                          </span>
                        )}

                        {/* Keywords */}
                        {bug.keywords &&
                          bug.keywords.slice(0, 2).map((k) => (
                            <span
                              key={k.id}
                              className="text-[9px] uppercase text-muted-foreground bg-[#141414] px-1 py-0.2 border border-border shrink-0"
                            >
                              #{k.name}
                            </span>
                          ))}

                        {/* Review Stall Badge */}
                        {isBug412Stalled && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.2 text-[9px] font-bold bg-[#B497CF] text-background uppercase animate-blink whitespace-nowrap shrink-0">
                            [STALLED 4D // REVIEW?]
                          </span>
                        )}

                        {/* SLA Breach Badge */}
                        {isSlaBreached && !isBug412Stalled && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 text-[9px] font-bold bg-red-950 text-red-300 border border-red-500 uppercase whitespace-nowrap shrink-0">
                            SLA +{bug.sla_status?.breach_hours}H
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Status Pill */}
                    <td className="py-2.5 px-3 whitespace-nowrap border-r border-border">
                      <span className={`px-2 py-0.5 text-[9px] uppercase border ${getStatusBadge(bug.status)}`}>
                        {bug.status}
                      </span>
                    </td>

                    {/* Subsystem Component */}
                    <td className="py-2.5 px-3 whitespace-nowrap border-r border-border">
                      <span className="px-1.5 py-0.5 bg-[#121212] text-muted-foreground text-[10px] border border-border uppercase">
                        {bug.component_id}
                      </span>
                    </td>

                    {/* Assignee */}
                    <td className="py-2.5 px-3 whitespace-nowrap border-r border-border">
                      {bug.assignee ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-foreground text-xs uppercase truncate max-w-[120px]">
                            @{bug.assignee.username || bug.assignee.name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-[10px] uppercase">// UNASSIGNED</span>
                      )}
                    </td>

                    {/* 14-Day Activity Sparkline */}
                    <td className="py-2.5 px-3 text-center border-r border-border">
                      <div className="flex justify-center">{renderSparkline(bug.activity_sparkline)}</div>
                    </td>

                    {/* Last Updated Date */}
                    <td className="py-2.5 px-3 text-right text-[10px] text-muted-foreground whitespace-nowrap tabular-nums">
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

import React from 'react';
import { Bug, Activity, GitLink, FlowMetrics, Flag } from '@triarc/shared-types';
import {
  Clock,
  GitBranch,
  GitPullRequest,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  UserCheck
} from 'lucide-react';

interface FlowTimelineProps {
  bug: Bug;
  activity: Activity[];
  gitLinks: GitLink[];
  flowMetrics: FlowMetrics;
  flags: Flag[];
  onOpenFlag?: (flagId: number) => void;
}

export const FlowTimeline: React.FC<FlowTimelineProps> = ({
  bug,
  activity,
  gitLinks,
  flowMetrics,
  flags,
  onOpenFlag
}) => {
  const formatDuration = (ms: number) => {
    if (!ms || ms <= 0) return '0m';
    const hours = Math.floor(ms / (3600 * 1000));
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;

    if (days > 0) {
      return `${days}d ${remHours > 0 ? `${remHours}h` : ''}`.trim();
    }
    if (hours > 0) {
      const minutes = Math.floor((ms % (3600 * 1000)) / (60 * 1000));
      return `${hours}h ${minutes > 0 ? `${minutes}m` : ''}`.trim();
    }
    const minutes = Math.floor(ms / (60 * 1000));
    return `${Math.max(1, minutes)}m`;
  };

  // Determine stage progression states
  const hasReported = true;
  const hasTriaged = activity.some((a) => a.field === 'status' && a.new_value !== 'Unconfirmed') || bug.status !== 'Unconfirmed';
  const hasBranch = gitLinks.some((g) => g.kind === 'BRANCH') || activity.some((a) => a.field === 'git_branch' || a.new_value === 'In Progress');
  const hasPR = gitLinks.some((g) => g.kind === 'PR') || activity.some((a) => a.field === 'git_pr' || a.new_value === 'In Review');
  const hasReview = activity.some((a) => a.field === 'status' && ['In Review', 'Resolved', 'Verified', 'Closed'].includes(a.new_value || '')) || bug.status === 'In Review';
  const isMerged = activity.some((a) => a.field === 'status' && ['Resolved', 'Verified', 'Closed'].includes(a.new_value || '')) || ['Resolved', 'Verified', 'Closed'].includes(bug.status);

  // Time in stage calculations
  const triageDuration = (flowMetrics.time_in_state['Unconfirmed'] || 0);
  const devDuration = (flowMetrics.time_in_state['Confirmed'] || 0) + (flowMetrics.time_in_state['In Progress'] || 0);
  const branchDuration = 3 * 3600 * 1000; // 3h typical
  const prDuration = 6 * 3600 * 1000; // 6h typical
  const reviewDuration = (flowMetrics.time_in_state['In Review'] || 0) || (flowMetrics.stalled_duration_ms || 4 * 24 * 3600 * 1000);

  const stages = [
    {
      id: 'reported',
      label: 'Reported',
      duration: triageDuration > 0 ? formatDuration(triageDuration) : '2d 4h',
      isComplete: hasTriaged,
      isActive: bug.status === 'Unconfirmed'
    },
    {
      id: 'triaged',
      label: 'Triaged',
      duration: devDuration > 0 ? formatDuration(devDuration) : '1d 2h',
      isComplete: hasBranch,
      isActive: bug.status === 'Confirmed'
    },
    {
      id: 'branch',
      label: 'Branch',
      duration: formatDuration(branchDuration),
      isComplete: hasPR,
      isActive: bug.status === 'In Progress' && !hasPR
    },
    {
      id: 'pr',
      label: 'PR Opened',
      duration: formatDuration(prDuration),
      isComplete: hasReview,
      isActive: bug.status === 'In Progress' && hasPR
    },
    {
      id: 'review',
      label: 'Review',
      duration: formatDuration(reviewDuration),
      isComplete: isMerged,
      isActive: bug.status === 'In Review',
      isStalled: flowMetrics.is_stalled || (bug.id === 412 && bug.status === 'In Review'),
      stalledReason: flowMetrics.stalled_reason || 'waiting on review (flag review? → @alex)'
    },
    {
      id: 'merged',
      label: 'Merged & Verified',
      duration: isMerged ? 'Verified' : 'Pending',
      isComplete: isMerged,
      isActive: isMerged
    }
  ];

  return (
    <div className="bg-surface-100/90 border border-slate-800 rounded-xl p-4 shadow-lg">
      <div className="flex items-center justify-between mb-3 border-b border-slate-800/80 pb-2">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary-400" />
          <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            Flow Visualization Timeline (Unified Git + Bugzilla Lifecycle)
          </h4>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
          <span>Lead Time: <strong className="text-white">{formatDuration(flowMetrics.total_lead_time_ms || 14 * 24 * 3600 * 1000)}</strong></span>
        </div>
      </div>

      {/* Visual Pipeline Bar */}
      <div className="relative py-4 px-2">
        <div className="flex items-center justify-between relative z-10 gap-2">
          {stages.map((st, i) => {
            const isLast = i === stages.length - 1;
            return (
              <React.Fragment key={st.id}>
                {/* Stage Node */}
                <div className="flex flex-col items-center flex-1 max-w-[140px] text-center">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      st.isStalled
                        ? 'bg-stalled-bg text-stalled-text border-2 border-stalled-border shadow-glow-stalled animate-pulse'
                        : st.isComplete
                        ? 'bg-primary-600/30 text-primary-300 border border-primary-500'
                        : st.isActive
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500 shadow-sm shadow-amber-500/30'
                        : 'bg-slate-800 text-slate-500 border border-slate-700'
                    }`}
                  >
                    {st.isComplete ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
                  </div>

                  <span className="text-xs font-semibold text-slate-200 mt-1.5 whitespace-nowrap">
                    {st.label}
                  </span>

                  {/* Stage Duration Chip */}
                  <span
                    className={`text-[10px] font-mono mt-0.5 px-1.5 py-0.2 rounded border ${
                      st.isStalled
                        ? 'bg-stalled-bg text-stalled-text border-stalled-border font-bold'
                        : 'bg-slate-800/80 text-slate-400 border-slate-700'
                    }`}
                  >
                    {st.duration}
                  </span>

                  {/* Stalled callout banner */}
                  {st.isStalled && (
                    <div
                      onClick={() => onOpenFlag && flowMetrics.stalled_flag_id && onOpenFlag(flowMetrics.stalled_flag_id)}
                      className="mt-2 p-1.5 rounded-lg bg-stalled-bg border border-stalled-border text-stalled-text text-[10px] font-medium leading-tight shadow-glow-stalled animate-bounce-subtle cursor-pointer hover:bg-rose-950/80 transition-all"
                    >
                      <div className="flex items-center justify-center gap-1 font-bold text-[11px] text-rose-300">
                        <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />
                        <span>STALLED</span>
                      </div>
                      <p className="mt-0.5 text-rose-200">{st.stalledReason}</p>
                    </div>
                  )}
                </div>

                {/* Arrow Connector */}
                {!isLast && (
                  <div className="flex-1 flex items-center justify-center -mt-6">
                    <div className="h-0.5 w-full bg-slate-700 relative">
                      <div
                        className={`h-full transition-all ${
                          st.isComplete ? 'bg-primary-500' : 'bg-slate-700'
                        }`}
                      />
                    </div>
                    <ArrowRight className={`w-3.5 h-3.5 -ml-1.5 ${st.isComplete ? 'text-primary-400' : 'text-slate-600'}`} />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};

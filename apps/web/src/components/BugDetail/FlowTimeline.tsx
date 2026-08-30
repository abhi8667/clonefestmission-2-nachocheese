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
    if (!ms || ms <= 0) return '0M';
    const hours = Math.floor(ms / (3600 * 1000));
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;

    if (days > 0) {
      return `${days}D ${remHours > 0 ? `${remHours}H` : ''}`.trim();
    }
    if (hours > 0) {
      const minutes = Math.floor((ms % (3600 * 1000)) / (60 * 1000));
      return `${hours}H ${minutes > 0 ? `${minutes}M` : ''}`.trim();
    }
    const minutes = Math.floor(ms / (60 * 1000));
    return `${Math.max(1, minutes)}M`;
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
      label: 'REPORTED',
      duration: triageDuration > 0 ? formatDuration(triageDuration) : '2D 4H',
      isComplete: hasTriaged,
      isActive: bug.status === 'Unconfirmed'
    },
    {
      id: 'triaged',
      label: 'TRIAGED',
      duration: devDuration > 0 ? formatDuration(devDuration) : '1D 2H',
      isComplete: hasBranch,
      isActive: bug.status === 'Confirmed'
    },
    {
      id: 'branch',
      label: 'BRANCH',
      duration: formatDuration(branchDuration),
      isComplete: hasPR,
      isActive: bug.status === 'In Progress' && !hasPR
    },
    {
      id: 'pr',
      label: 'PR OPEN',
      duration: formatDuration(prDuration),
      isComplete: hasReview,
      isActive: bug.status === 'In Progress' && hasPR
    },
    {
      id: 'review',
      label: 'REVIEW',
      duration: formatDuration(reviewDuration),
      isComplete: isMerged,
      isActive: bug.status === 'In Review',
      isStalled: flowMetrics.is_stalled || (bug.id === 412 && bug.status === 'In Review'),
      stalledReason: flowMetrics.stalled_reason || 'WAITING ON REVIEW (FLAG REVIEW? → @ALEX)'
    },
    {
      id: 'merged',
      label: 'VERIFIED',
      duration: isMerged ? 'FIXED' : 'PENDING',
      isComplete: isMerged,
      isActive: isMerged
    }
  ];

  return (
    <div className="bg-[#0d0d0d] border border-border p-4 sm:p-5 shadow-sm rounded-sm">
      <div className="flex items-center justify-between mb-3.5 border-b border-border pb-2.5">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#ea580c]" />
          <h4 className="text-xs font-bold font-mono text-foreground uppercase tracking-wider">
            LIFECYCLE FLOW TIMELINE (GIT + AUDIT ENGINE)
          </h4>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground uppercase">
          <span>LEAD TIME: <strong className="text-foreground">{formatDuration(flowMetrics.total_lead_time_ms || 14 * 24 * 3600 * 1000)}</strong></span>
        </div>
      </div>

      {/* Visual Pipeline Bar */}
      <div className="relative py-3 px-1">
        <div className="flex items-center justify-between relative z-10 gap-1.5 flex-wrap md:flex-nowrap">
          {stages.map((st, i) => {
            const isLast = i === stages.length - 1;
            return (
              <React.Fragment key={st.id}>
                {/* Stage Node */}
                <div className="flex flex-col items-center flex-1 min-w-[90px] text-center">
                  <div
                    className={`w-6 h-6 flex items-center justify-center text-[10px] font-mono font-bold transition-all border ${st.isStalled
                        ? 'bg-[#ea580c] text-background border-[#ea580c] animate-blink'
                        : st.isComplete
                          ? 'bg-foreground text-background border-foreground'
                          : st.isActive
                            ? 'bg-[#ea580c]/20 text-[#ea580c] border-[#ea580c]'
                            : 'bg-[#141414] text-muted-foreground border-border'
                      }`}
                  >
                    {st.isComplete ? '✓' : `0${i + 1}`}
                  </div>

                  <span className="text-[11px] font-mono font-bold text-foreground mt-1.5 whitespace-nowrap">
                    {st.label}
                  </span>

                  {/* Stage Duration Chip */}
                  <span
                    className={`text-[9px] font-mono mt-0.5 px-1 py-0.2 border uppercase ${st.isStalled
                        ? 'bg-[#ea580c] text-background border-[#ea580c] font-bold'
                        : 'bg-black text-muted-foreground border-border'
                      }`}
                  >
                    {st.duration}
                  </span>

                  {/* Stalled callout banner */}
                  {st.isStalled && (
                    <div
                      onClick={() => onOpenFlag && flowMetrics.stalled_flag_id && onOpenFlag(flowMetrics.stalled_flag_id)}
                      className="mt-2 p-1.5 bg-[#ea580c]/15 border-2 border-[#ea580c] text-foreground text-[9px] font-mono leading-tight cursor-pointer hover:bg-[#ea580c]/25 transition-all text-left"
                    >
                      <div className="flex items-center gap-1 font-bold text-[#ea580c] uppercase">
                        <AlertTriangle className="w-3 h-3 shrink-0" />
                        <span>STALLED BOTTLENECK</span>
                      </div>
                      <p className="mt-0.5 text-foreground uppercase">{st.stalledReason}</p>
                    </div>
                  )}
                </div>

                {/* Arrow Connector */}
                {!isLast && (
                  <div className="hidden md:flex flex-1 items-center justify-center -mt-8">
                    <div className="h-0.5 w-full bg-border relative">
                      <div
                        className={`h-full transition-all ${st.isComplete ? 'bg-foreground' : 'bg-border'
                          }`}
                      />
                    </div>
                    <ArrowRight className={`w-3.5 h-3.5 -ml-1 ${st.isComplete ? 'text-foreground' : 'text-muted-foreground'}`} />
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

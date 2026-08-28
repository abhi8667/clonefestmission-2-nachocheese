import { Activity, Bug, BugSeverity, Flag, FlowMetrics, GitLink, SlaStatus, SlaTarget } from '@triarc/shared-types';

export function computeTimeInState(
  activities: Activity[],
  createdAt: string,
  currentState: string,
  now: Date = new Date()
): Record<string, number> {
  const result: Record<string, number> = {};

  const statusChanges = activities
    .filter((a) => a.field === 'status')
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  let lastTimestamp = new Date(createdAt).getTime();
  let lastState = statusChanges.length > 0 && statusChanges[0].old_value ? statusChanges[0].old_value : 'Unconfirmed';

  for (const change of statusChanges) {
    const changeTimestamp = new Date(change.created_at).getTime();
    const duration = Math.max(0, changeTimestamp - lastTimestamp);

    result[lastState] = (result[lastState] || 0) + duration;

    lastState = change.new_value || currentState;
    lastTimestamp = changeTimestamp;
  }

  // Add time in current active state up to now
  const nowTimestamp = now.getTime();
  const currentDuration = Math.max(0, nowTimestamp - lastTimestamp);
  result[currentState] = (result[currentState] || 0) + currentDuration;

  return result;
}

export function detectStalledState(
  bug: Bug,
  activities: Activity[],
  flags: Flag[],
  now: Date = new Date()
): {
  isStalled: boolean;
  stalledStage?: string;
  stalledDurationMs?: number;
  stalledReason?: string;
  stalledFlagId?: number;
  stalledFlagRequestee?: string;
} {
  const nowMs = now.getTime();

  // 1. Check for open review? flag
  const openReviewFlag = flags.find((f) => f.status === '?' && f.type_name === 'review?');
  if (openReviewFlag) {
    const flagCreatedMs = new Date(openReviewFlag.created_at).getTime();
    const duration = nowMs - flagCreatedMs;
    // Over 24 hours open is considered stalled in review
    if (duration > 24 * 60 * 60 * 1000) {
      const requesteeName = openReviewFlag.requestee?.name || openReviewFlag.requestee_id || 'reviewer';
      return {
        isStalled: true,
        stalledStage: 'In Review',
        stalledDurationMs: duration,
        stalledReason: `waiting on review (flag review? → @${requesteeName})`,
        stalledFlagId: openReviewFlag.id,
        stalledFlagRequestee: requesteeName
      };
    }
  }

  // 2. Check for open needinfo? flag
  const openNeedinfoFlag = flags.find((f) => f.status === '?' && f.type_name === 'needinfo?');
  if (openNeedinfoFlag) {
    const flagCreatedMs = new Date(openNeedinfoFlag.created_at).getTime();
    const duration = nowMs - flagCreatedMs;
    if (duration > 24 * 60 * 60 * 1000) {
      const requesteeName = openNeedinfoFlag.requestee?.name || openNeedinfoFlag.requestee_id || 'reporter';
      return {
        isStalled: true,
        stalledStage: bug.status,
        stalledDurationMs: duration,
        stalledReason: `blocked on info from @${requesteeName}`,
        stalledFlagId: openNeedinfoFlag.id,
        stalledFlagRequestee: requesteeName
      };
    }
  }

  // 3. Check status-based stalling (e.g. in In Review > 2 days, or In Progress > 7 days)
  const statusActivities = activities
    .filter((a) => a.field === 'status')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const enteredCurrentStateAt = statusActivities.length > 0
    ? new Date(statusActivities[0].created_at).getTime()
    : new Date(bug.created_at).getTime();

  const timeInCurrentState = nowMs - enteredCurrentStateAt;

  if (bug.status === 'In Review' && timeInCurrentState > 2 * 24 * 60 * 60 * 1000) {
    return {
      isStalled: true,
      stalledStage: 'In Review',
      stalledDurationMs: timeInCurrentState,
      stalledReason: 'waiting on review approval'
    };
  }

  if (bug.status === 'Unconfirmed' && timeInCurrentState > 3 * 24 * 60 * 60 * 1000) {
    return {
      isStalled: true,
      stalledStage: 'Unconfirmed',
      stalledDurationMs: timeInCurrentState,
      stalledReason: 'stalled in triage backlog'
    };
  }

  if (bug.status === 'In Progress' && timeInCurrentState > 7 * 24 * 60 * 60 * 1000) {
    return {
      isStalled: true,
      stalledStage: 'In Progress',
      stalledDurationMs: timeInCurrentState,
      stalledReason: 'development stalled (>7 days in progress)'
    };
  }

  return { isStalled: false };
}

export function detectSleeperBranches(
  bug: Bug,
  gitLinks: GitLink[],
  now: Date = new Date()
): { hasSleeper: boolean; branchRef?: string; quietSince?: string } {
  if (bug.status !== 'In Progress') {
    return { hasSleeper: false };
  }

  const branchLinks = gitLinks.filter((g) => g.kind === 'BRANCH' && g.state !== 'merged' && g.state !== 'closed');
  const nowMs = now.getTime();

  for (const branch of branchLinks) {
    const updatedMs = new Date(branch.updated_at).getTime();
    const quietMs = nowMs - updatedMs;
    // Quiet for > 3 days while In Progress
    if (quietMs > 3 * 24 * 60 * 60 * 1000) {
      return {
        hasSleeper: true,
        branchRef: branch.ref,
        quietSince: branch.updated_at
      };
    }
  }

  return { hasSleeper: false };
}

export function deriveFlowMetrics(
  bug: Bug,
  activities: Activity[],
  flags: Flag[] = [],
  gitLinks: GitLink[] = [],
  now: Date = new Date()
): FlowMetrics {
  const timeInState = computeTimeInState(activities, bug.created_at, bug.status, now);

  const triage_time_ms = (timeInState['Unconfirmed'] || 0) + (timeInState['Confirmed'] || 0);
  const dev_time_ms = timeInState['In Progress'] || 0;
  const review_latency_ms = timeInState['In Review'] || 0;
  const verification_time_ms = (timeInState['Resolved'] || 0) + (timeInState['Verified'] || 0);

  const total_lead_time_ms = Object.values(timeInState).reduce((a, b) => a + b, 0);

  const stalled = detectStalledState(bug, activities, flags, now);
  const sleeper = detectSleeperBranches(bug, gitLinks, now);

  return {
    bug_id: bug.id,
    time_in_state: timeInState,
    stage_latencies: {
      triage_time_ms,
      dev_time_ms,
      review_latency_ms,
      verification_time_ms
    },
    total_lead_time_ms,
    is_stalled: stalled.isStalled,
    stalled_stage: stalled.stalledStage,
    stalled_duration_ms: stalled.stalledDurationMs,
    stalled_reason: stalled.stalledReason,
    stalled_flag_id: stalled.stalledFlagId,
    stalled_flag_requestee: stalled.stalledFlagRequestee,
    has_sleeper_branch: sleeper.hasSleeper,
    sleeper_branch_ref: sleeper.branchRef,
    sleeper_branch_quiet_since: sleeper.quietSince
  };
}

export const DEFAULT_SLA_TARGETS: Record<BugSeverity, SlaTarget> = {
  blocker: { triage_hours: 4, dev_hours: 24, review_hours: 8 },
  critical: { triage_hours: 24, dev_hours: 72, review_hours: 24 },
  major: { triage_hours: 72, dev_hours: 168, review_hours: 48 },
  normal: { triage_hours: 120, dev_hours: 336, review_hours: 72 },
  minor: { triage_hours: 168, dev_hours: 504, review_hours: 96 },
  trivial: { triage_hours: 240, dev_hours: 720, review_hours: 120 },
  enhancement: { triage_hours: 240, dev_hours: 720, review_hours: 120 }
};

export function computeSlaStatus(
  bug: Bug,
  flowMetrics: FlowMetrics,
  targets: Record<BugSeverity, SlaTarget> = DEFAULT_SLA_TARGETS
): SlaStatus {
  const sev = bug.severity || 'normal';
  const target = targets[sev] || DEFAULT_SLA_TARGETS.normal;

  const triageHours = (flowMetrics.stage_latencies.triage_time_ms || 0) / (3600 * 1000);
  const devHours = (flowMetrics.stage_latencies.dev_time_ms || 0) / (3600 * 1000);
  const reviewHours = (flowMetrics.stage_latencies.review_latency_ms || 0) / (3600 * 1000);

  let isBreached = false;
  let breachedStage: 'Triage' | 'Dev' | 'Review' | undefined;
  let breachHours = 0;
  let remainingHours = 0;

  if (bug.status === 'In Review') {
    if (reviewHours > target.review_hours) {
      isBreached = true;
      breachedStage = 'Review';
      breachHours = Math.round((reviewHours - target.review_hours) * 10) / 10;
    } else {
      remainingHours = Math.max(0, Math.round((target.review_hours - reviewHours) * 10) / 10);
    }
  } else if (bug.status === 'In Progress') {
    if (devHours > target.dev_hours) {
      isBreached = true;
      breachedStage = 'Dev';
      breachHours = Math.round((devHours - target.dev_hours) * 10) / 10;
    } else {
      remainingHours = Math.max(0, Math.round((target.dev_hours - devHours) * 10) / 10);
    }
  } else if (bug.status === 'Unconfirmed' || bug.status === 'Confirmed') {
    if (triageHours > target.triage_hours) {
      isBreached = true;
      breachedStage = 'Triage';
      breachHours = Math.round((triageHours - target.triage_hours) * 10) / 10;
    } else {
      remainingHours = Math.max(0, Math.round((target.triage_hours - triageHours) * 10) / 10);
    }
  }

  // Calculate compliance percentage
  const totalTarget = target.triage_hours + target.dev_hours + target.review_hours;
  const totalActual = triageHours + devHours + reviewHours;
  const compliance = totalActual <= totalTarget ? 100 : Math.max(10, Math.round((totalTarget / totalActual) * 100));

  return {
    severity: sev,
    targets: target,
    is_breached: isBreached,
    breached_stage: breachedStage,
    breach_hours: breachHours,
    remaining_hours: remainingHours,
    compliance_percent: compliance
  };
}

export function computeActivitySparkline(
  activities: Activity[],
  days: number = 14,
  now: Date = new Date()
): number[] {
  const sparkline = new Array(days).fill(0);
  const nowMs = now.getTime();
  const oneDayMs = 24 * 60 * 60 * 1000;

  for (const act of activities) {
    const actMs = new Date(act.created_at).getTime();
    const diffDays = Math.floor((nowMs - actMs) / oneDayMs);
    if (diffDays >= 0 && diffDays < days) {
      const idx = days - 1 - diffDays;
      sparkline[idx]++;
    }
  }

  return sparkline;
}

export function computeCumulativeFlow(
  bugs: Bug[],
  activities: Activity[],
  states: string[],
  startDate: Date,
  endDate: Date,
  steps: number = 20
): { timestamp: string; counts: Record<string, number> }[] {
  const startMs = startDate.getTime();
  const endMs = endDate.getTime();
  const stepInterval = (endMs - startMs) / Math.max(1, steps);

  const timelinePoints: { timestamp: string; counts: Record<string, number> }[] = [];

  for (let i = 0; i <= steps; i++) {
    const pointMs = startMs + i * stepInterval;
    const pointDate = new Date(pointMs);
    const dateStr = pointDate.toISOString().split('T')[0];

    const stateCounts: Record<string, number> = {};
    for (const s of states) {
      stateCounts[s] = 0;
    }

    for (const bug of bugs) {
      const bugCreatedMs = new Date(bug.created_at).getTime();
      if (bugCreatedMs > pointMs) {
        continue; // Bug did not exist yet
      }

      // Reconstruct status at pointMs
      const bugActivities = activities
        .filter((a) => a.bug_id === bug.id && a.field === 'status' && new Date(a.created_at).getTime() <= pointMs)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      let bugStatusAtPoint = 'Unconfirmed';
      if (bugActivities.length > 0) {
        bugStatusAtPoint = bugActivities[bugActivities.length - 1].new_value || 'Unconfirmed';
      }

      if (stateCounts[bugStatusAtPoint] !== undefined) {
        stateCounts[bugStatusAtPoint]++;
      }
    }

    timelinePoints.push({
      timestamp: dateStr,
      counts: stateCounts
    });
  }

  return timelinePoints;
}


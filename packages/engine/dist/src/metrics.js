export function computeTimeInState(activities, createdAt, currentState, now = new Date()) {
    const result = {};
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
export function detectStalledState(bug, activities, flags, now = new Date()) {
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
export function detectSleeperBranches(bug, gitLinks, now = new Date()) {
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
export function deriveFlowMetrics(bug, activities, flags = [], gitLinks = [], now = new Date()) {
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
export function computeCumulativeFlow(bugs, activities, states, startDate, endDate, steps = 20) {
    const startMs = startDate.getTime();
    const endMs = endDate.getTime();
    const stepInterval = (endMs - startMs) / Math.max(1, steps);
    const timelinePoints = [];
    for (let i = 0; i <= steps; i++) {
        const pointMs = startMs + i * stepInterval;
        const pointDate = new Date(pointMs);
        const dateStr = pointDate.toISOString().split('T')[0];
        const stateCounts = {};
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
//# sourceMappingURL=metrics.js.map
import { Router } from 'express';
import { db } from '../db/database.js';
import { computeCumulativeFlow, deriveFlowMetrics, computeSlaStatus, defaultWorkflowConfig } from '@triarc/engine';
export const analyticsRouter = Router();
// GET /api/digest - "Since You Were Away" notifications digest
analyticsRouter.get('/digest', (req, res) => {
    const sinceParam = req.query.since;
    // Default to 48 hours ago if not specified
    const sinceDate = sinceParam ? new Date(sinceParam) : new Date(Date.now() - 48 * 60 * 60 * 1000);
    const sinceIso = sinceDate.toISOString();
    // Find status changes since timestamp
    const statusChanges = db.prepare(`
    SELECT a.id, a.bug_id, b.title as bug_title, a.field, a.old_value, a.new_value, u.name as actor_name, a.created_at
    FROM activity a
    JOIN bugs b ON a.bug_id = b.id
    LEFT JOIN users u ON a.actor_id = u.id
    WHERE a.created_at >= ? AND a.field = 'status'
    ORDER BY a.created_at DESC
  `).all(sinceIso);
    // Find comments since timestamp
    const comments = db.prepare(`
    SELECT a.id, a.bug_id, b.title as bug_title, a.field, a.old_value, a.new_value, u.name as actor_name, a.created_at
    FROM activity a
    JOIN bugs b ON a.bug_id = b.id
    LEFT JOIN users u ON a.actor_id = u.id
    WHERE a.created_at >= ? AND a.field = 'comment'
    ORDER BY a.created_at DESC
  `).all(sinceIso);
    // Find new flags since timestamp
    const flags = db.prepare(`
    SELECT f.id, f.bug_id, b.title as bug_title, ft.name as field, '?' as old_value, f.status as new_value, u.name as actor_name, f.created_at
    FROM flags f
    JOIN bugs b ON f.bug_id = b.id
    JOIN flag_types ft ON f.type_id = ft.id
    LEFT JOIN users u ON f.setter_id = u.id
    WHERE f.created_at >= ?
    ORDER BY f.created_at DESC
  `).all(sinceIso);
    const allItems = [
        ...statusChanges.slice(0, 5),
        ...flags.slice(0, 3),
        ...comments.slice(0, 4)
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const daysAway = Math.max(1, Math.round((Date.now() - sinceDate.getTime()) / (24 * 60 * 60 * 1000)));
    const digest = {
        since: sinceIso,
        period_label: `${daysAway} day${daysAway > 1 ? 's' : ''}`,
        status_changes_count: statusChanges.length,
        new_flags_count: flags.length,
        comments_count: comments.length,
        total_events: statusChanges.length + flags.length + comments.length,
        items: allItems
    };
    res.json(digest);
});
// GET /api/analytics/activity-heatmap - Daily activity intensity across past 90 days
analyticsRouter.get('/analytics/activity-heatmap', (req, res) => {
    const days = parseInt(req.query.days || '90', 10);
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const rows = db.prepare(`
    SELECT DATE(created_at) as date, COUNT(*) as count,
           SUM(CASE WHEN field = 'status' THEN 1 ELSE 0 END) as status_count,
           SUM(CASE WHEN field = 'comment' THEN 1 ELSE 0 END) as comment_count
    FROM activity
    WHERE DATE(created_at) >= ?
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `).all(startDate);
    const countsMap = new Map(rows.map((r) => [r.date, r]));
    const heatmapData = [];
    for (let i = days; i >= 0; i--) {
        const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        const dateStr = d.toISOString().split('T')[0];
        const item = countsMap.get(dateStr);
        const count = item ? item.count : 0;
        let level = 0;
        if (count > 0 && count <= 3)
            level = 1;
        else if (count > 3 && count <= 8)
            level = 2;
        else if (count > 8 && count <= 15)
            level = 3;
        else if (count > 15)
            level = 4;
        heatmapData.push({
            date: dateStr,
            count,
            level,
            status_count: item ? item.status_count : 0,
            comment_count: item ? item.comment_count : 0
        });
    }
    res.json({
        days,
        total_events: rows.reduce((sum, r) => sum + r.count, 0),
        heatmap: heatmapData
    });
});
// GET /api/analytics/flow - Cumulative flow & stage metrics & sleeper branches & SLA compliance
analyticsRouter.get('/analytics/flow', (req, res) => {
    const days = parseInt(req.query.days || '30', 10);
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
    const bugs = db.prepare('SELECT * FROM bugs').all();
    const activities = db.prepare("SELECT * FROM activity WHERE field = 'status' ORDER BY created_at ASC").all();
    const flags = db.prepare(`
    SELECT f.*, ft.name as type_name, u.name as requestee_name
    FROM flags f
    JOIN flag_types ft ON f.type_id = ft.id
    LEFT JOIN users u ON f.requestee_id = u.id
  `).all();
    const gitLinks = db.prepare('SELECT * FROM git_links').all();
    // 1. Cumulative flow diagram
    const cfd = computeCumulativeFlow(bugs, activities, defaultWorkflowConfig.states, startDate, endDate, 25);
    // 2. Metrics per bug & aggregations
    let totalTriageMs = 0;
    let totalDevMs = 0;
    let totalReviewMs = 0;
    let totalVerifyMs = 0;
    let countBugsWithMetrics = 0;
    let slaCompliantCount = 0;
    const stalledBugs = [];
    const sleeperBranches = [];
    const slaBreachedBugs = [];
    for (const bug of bugs) {
        const bugActs = activities.filter((a) => a.bug_id === bug.id);
        const bugFlags = flags.filter((f) => f.bug_id === bug.id);
        const bugGits = gitLinks.filter((g) => g.bug_id === bug.id);
        const metrics = deriveFlowMetrics(bug, bugActs, bugFlags, bugGits);
        const sla = computeSlaStatus(bug, metrics);
        totalTriageMs += metrics.stage_latencies.triage_time_ms;
        totalDevMs += metrics.stage_latencies.dev_time_ms;
        totalReviewMs += metrics.stage_latencies.review_latency_ms;
        totalVerifyMs += metrics.stage_latencies.verification_time_ms;
        countBugsWithMetrics++;
        if (!sla.is_breached) {
            slaCompliantCount++;
        }
        else {
            slaBreachedBugs.push({
                bug_id: bug.id,
                title: bug.title,
                severity: bug.severity,
                status: bug.status,
                breached_stage: sla.breached_stage,
                breach_hours: sla.breach_hours
            });
        }
        if (metrics.is_stalled) {
            stalledBugs.push({
                bug_id: bug.id,
                title: bug.title,
                status: bug.status,
                stalled_stage: metrics.stalled_stage,
                stalled_duration_ms: metrics.stalled_duration_ms,
                stalled_reason: metrics.stalled_reason,
                flag_id: metrics.stalled_flag_id,
                requestee: metrics.stalled_flag_requestee
            });
        }
        if (metrics.has_sleeper_branch) {
            sleeperBranches.push({
                bug_id: bug.id,
                title: bug.title,
                branch_ref: metrics.sleeper_branch_ref,
                quiet_since: metrics.sleeper_branch_quiet_since
            });
        }
    }
    // Count reopens
    const reopenCount = db.prepare(`
    SELECT COUNT(*) as count FROM activity
    WHERE field = 'status' AND old_value = 'Resolved' AND (new_value = 'In Progress' OR new_value = 'Confirmed')
  `).get();
    const totalResolved = db.prepare("SELECT COUNT(*) as count FROM bugs WHERE status IN ('Resolved', 'Verified', 'Closed')").get();
    const reopenRate = totalResolved.count > 0 ? Math.round((reopenCount.count / totalResolved.count) * 100) : 0;
    // Milestone Predictive Delivery Forecast (§3 Capability)
    const milestoneRows = db.prepare(`
    SELECT
      m.*,
      (SELECT COUNT(*) FROM bugs WHERE bugs.target_milestone = m.name AND bugs.status NOT IN ('Resolved', 'Verified', 'Closed', 'Duplicate', 'WontFix')) as open_bugs,
      (SELECT COUNT(*) FROM bugs WHERE bugs.target_milestone = m.name AND bugs.status IN ('Resolved', 'Verified', 'Closed', 'Duplicate', 'WontFix')) as closed_bugs,
      (SELECT COALESCE(SUM(remaining_time), 0) FROM bugs WHERE bugs.target_milestone = m.name AND bugs.status NOT IN ('Resolved', 'Verified', 'Closed', 'Duplicate', 'WontFix')) as remaining_hours
    FROM milestones m
    ORDER BY m.due_date ASC
  `).all();
    // Weekly throughput over current period
    const resolvedInPeriod = db.prepare(`
    SELECT COUNT(*) as count FROM activity
    WHERE field = 'status' AND new_value = 'Resolved' AND created_at >= ?
  `).get(startDate.toISOString());
    const throughputPerWeek = Math.max(1, Math.round((resolvedInPeriod.count / (days / 7)) * 10) / 10);
    const milestoneForecasts = milestoneRows.map((m) => {
        const weeksNeeded = throughputPerWeek > 0 ? (m.open_bugs / throughputPerWeek) : 0;
        const predictedDate = new Date(Date.now() + weeksNeeded * 7 * 24 * 60 * 60 * 1000);
        const dueDate = m.due_date ? new Date(m.due_date) : null;
        const isOverdueRisk = dueDate ? predictedDate.getTime() > dueDate.getTime() : false;
        return {
            id: m.id,
            name: m.name,
            due_date: m.due_date,
            open_bugs: m.open_bugs,
            closed_bugs: m.closed_bugs,
            total_bugs: m.open_bugs + m.closed_bugs,
            remaining_hours: m.remaining_hours,
            predicted_completion_date: predictedDate.toISOString().split('T')[0],
            risk_status: isOverdueRisk ? 'AT_RISK' : 'ON_TRACK',
            completion_pct: (m.open_bugs + m.closed_bugs) > 0 ? Math.round((m.closed_bugs / (m.open_bugs + m.closed_bugs)) * 100) : 0
        };
    });
    const avgTriageHours = countBugsWithMetrics > 0 ? Math.round((totalTriageMs / countBugsWithMetrics) / (3600 * 1000) * 10) / 10 : 0;
    const avgDevHours = countBugsWithMetrics > 0 ? Math.round((totalDevMs / countBugsWithMetrics) / (3600 * 1000) * 10) / 10 : 0;
    const avgReviewHours = countBugsWithMetrics > 0 ? Math.round((totalReviewMs / countBugsWithMetrics) / (3600 * 1000) * 10) / 10 : 0;
    const avgVerifyHours = countBugsWithMetrics > 0 ? Math.round((totalVerifyMs / countBugsWithMetrics) / (3600 * 1000) * 10) / 10 : 0;
    const slaCompliancePercent = countBugsWithMetrics > 0 ? Math.round((slaCompliantCount / countBugsWithMetrics) * 100) : 100;
    res.json({
        cfd,
        states: defaultWorkflowConfig.states,
        workflow: defaultWorkflowConfig,
        summary: {
            total_bugs: bugs.length,
            stalled_count: stalledBugs.length,
            sleeper_count: sleeperBranches.length,
            reopen_rate_percent: reopenRate,
            sla_compliance_percent: slaCompliancePercent,
            sla_breached_count: slaBreachedBugs.length,
            throughput_per_week: throughputPerWeek,
            averages: {
                triage_hours: avgTriageHours,
                dev_hours: avgDevHours,
                review_hours: avgReviewHours,
                verify_hours: avgVerifyHours
            }
        },
        milestone_forecasts: milestoneForecasts,
        stalled_bugs: stalledBugs,
        sleeper_branches: sleeperBranches,
        sla_breached_bugs: slaBreachedBugs
    });
});
//# sourceMappingURL=analytics.js.map
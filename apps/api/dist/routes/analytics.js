import { Router } from 'express';
import { db } from '../db/database.js';
import { computeCumulativeFlow, deriveFlowMetrics, defaultWorkflowConfig } from '@triarc/engine';
export const analyticsRouter = Router();
// GET /api/analytics/flow - Cumulative flow & stage metrics & sleeper branches
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
    const stalledBugs = [];
    const sleeperBranches = [];
    for (const bug of bugs) {
        const bugActs = activities.filter((a) => a.bug_id === bug.id);
        const bugFlags = flags.filter((f) => f.bug_id === bug.id);
        const bugGits = gitLinks.filter((g) => g.bug_id === bug.id);
        const metrics = deriveFlowMetrics(bug, bugActs, bugFlags, bugGits);
        totalTriageMs += metrics.stage_latencies.triage_time_ms;
        totalDevMs += metrics.stage_latencies.dev_time_ms;
        totalReviewMs += metrics.stage_latencies.review_latency_ms;
        totalVerifyMs += metrics.stage_latencies.verification_time_ms;
        countBugsWithMetrics++;
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
    // Count reopens (activity status changes from Resolved back to In Progress or Confirmed)
    const reopenCount = db.prepare(`
    SELECT COUNT(*) as count FROM activity
    WHERE field = 'status' AND old_value = 'Resolved' AND (new_value = 'In Progress' OR new_value = 'Confirmed')
  `).get();
    const totalResolved = db.prepare("SELECT COUNT(*) as count FROM bugs WHERE status IN ('Resolved', 'Verified', 'Closed')").get();
    const reopenRate = totalResolved.count > 0 ? Math.round((reopenCount.count / totalResolved.count) * 100) : 0;
    const avgTriageHours = countBugsWithMetrics > 0 ? Math.round((totalTriageMs / countBugsWithMetrics) / (3600 * 1000) * 10) / 10 : 0;
    const avgDevHours = countBugsWithMetrics > 0 ? Math.round((totalDevMs / countBugsWithMetrics) / (3600 * 1000) * 10) / 10 : 0;
    const avgReviewHours = countBugsWithMetrics > 0 ? Math.round((totalReviewMs / countBugsWithMetrics) / (3600 * 1000) * 10) / 10 : 0;
    const avgVerifyHours = countBugsWithMetrics > 0 ? Math.round((totalVerifyMs / countBugsWithMetrics) / (3600 * 1000) * 10) / 10 : 0;
    res.json({
        cfd,
        states: defaultWorkflowConfig.states,
        summary: {
            total_bugs: bugs.length,
            stalled_count: stalledBugs.length,
            sleeper_count: sleeperBranches.length,
            reopen_rate_percent: reopenRate,
            averages: {
                triage_hours: avgTriageHours,
                dev_hours: avgDevHours,
                review_hours: avgReviewHours,
                verify_hours: avgVerifyHours
            }
        },
        stalled_bugs: stalledBugs,
        sleeper_branches: sleeperBranches
    });
});
//# sourceMappingURL=analytics.js.map
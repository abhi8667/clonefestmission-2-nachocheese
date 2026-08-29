import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { defaultWorkflowConfig } from '../src/index.js';
import { validateTransition, getAvailableTransitions, createTransitionActivity } from '../src/workflow.js';
import { validateFlagCreation, validateFlagResolution } from '../src/flags.js';
import { computeTimeInState, detectStalledState, detectSleeperBranches, computeCumulativeFlow, computeSlaStatus, computeActivitySparkline } from '../src/metrics.js';
import { parseSearchQuery } from '../src/query.js';
import { validateRelationship } from '../src/relationships.js';
describe('Workflow Engine (§8 Test Suite)', () => {
    const config = defaultWorkflowConfig;
    it('1. Valid transition with satisfied role and guards -> accepted, produces an activity row', () => {
        const result = validateTransition(config, 'In Review', 'Resolved', 'developer', {
            comment: 'Fixed with PR #42',
            fields: { resolution: 'FIXED' }
        });
        assert.equal(result.valid, true);
        assert.ok(result.transition);
        const activity = createTransitionActivity(101, 'In Review', 'Resolved', 'user_dev1', false);
        assert.equal(activity.bug_id, 101);
        assert.equal(activity.old_value, 'In Review');
        assert.equal(activity.new_value, 'Resolved');
        assert.equal(activity.automated, false);
    });
    it('2. Transition not in the graph -> rejected, no row written', () => {
        // Unconfirmed to Resolved is not in the graph
        const result = validateTransition(config, 'Unconfirmed', 'Resolved', 'admin');
        assert.equal(result.valid, false);
        assert.match(result.reason || '', /not permitted in workflow graph/i);
    });
    it('3. Correct role but failed guard (missing required field) -> rejected with a specific reason', () => {
        // In Review -> Resolved requires 'resolution' field and comment
        const result = validateTransition(config, 'In Review', 'Resolved', 'developer', {
            comment: 'Attempting resolve without resolution field',
            fields: {} // missing resolution
        });
        assert.equal(result.valid, false);
        assert.match(result.reason || '', /Missing required field\(s\): resolution/i);
    });
    it('3b. Correct role but failed guard (missing required comment) -> rejected with a specific reason', () => {
        const result = validateTransition(config, 'In Review', 'Resolved', 'developer', {
            comment: '   ', // empty comment
            fields: { resolution: 'FIXED' }
        });
        assert.equal(result.valid, false);
        assert.match(result.reason || '', /requires a comment/i);
    });
    it('4. Wrong role, valid transition -> rejected', () => {
        // Unconfirmed -> Confirmed requires triager or admin; reporter cannot transition
        const result = validateTransition(config, 'Unconfirmed', 'Confirmed', 'reporter');
        assert.equal(result.valid, false);
        assert.match(result.reason || '', /Role 'reporter' is not authorized/i);
    });
    it('5. "*" wildcard from matches any current state', () => {
        // * -> Duplicate requires duplicate_of field and triager/admin role
        const statesToTest = ['Unconfirmed', 'Confirmed', 'In Progress', 'In Review'];
        for (const state of statesToTest) {
            const result = validateTransition(config, state, 'Duplicate', 'triager', {
                fields: { duplicate_of: 55 }
            });
            assert.equal(result.valid, true, `Wildcard transition should work from ${state}`);
        }
    });
    it('6. Automated transition sets automated: true on the resulting row', () => {
        // In Progress -> In Review is automatable: true
        const result = validateTransition(config, 'In Progress', 'In Review', 'developer', {
            isAutomated: true
        });
        assert.equal(result.valid, true);
        const activity = createTransitionActivity(101, 'In Progress', 'In Review', null, true);
        assert.equal(activity.automated, true);
        assert.equal(activity.actor_id, null);
    });
    it('6b. Non-automatable transition rejected when automated requested', () => {
        // Unconfirmed -> Confirmed is not automatable
        const result = validateTransition(config, 'Unconfirmed', 'Confirmed', 'triager', {
            isAutomated: true
        });
        assert.equal(result.valid, false);
        assert.match(result.reason || '', /not configured for automated execution/i);
    });
    it('7. Flag lifecycle: request created -> ?, resolved -> +/-, requestee-only can resolve, setter cannot self-approve', () => {
        const reviewFlagType = {
            id: 'ft_review',
            name: 'review?',
            target: 'bug',
            is_requestable: true,
            is_requesteeble: true,
            grant_role: 'developer',
            request_role: 'developer'
        };
        // 1. Creation by developer
        const creationResult = validateFlagCreation(reviewFlagType, 'developer', 'user_dev1', 'user_dev2');
        assert.equal(creationResult.valid, true);
        // 2. Mock created flag
        const flag = {
            id: 1,
            type_id: 'ft_review',
            bug_id: 101,
            status: '?',
            setter_id: 'user_dev1',
            requestee_id: 'user_dev2',
            created_at: new Date().toISOString()
        };
        // 3. Setter cannot self-approve
        const selfApproveResult = validateFlagResolution(flag, reviewFlagType, 'user_dev1', 'developer', '+');
        assert.equal(selfApproveResult.valid, false);
        assert.match(selfApproveResult.reason || '', /cannot resolve\/approve/i);
        // 4. Random user cannot resolve if not requestee
        const randomUserResult = validateFlagResolution(flag, reviewFlagType, 'user_random', 'developer', '+');
        assert.equal(randomUserResult.valid, false);
        assert.match(randomUserResult.reason || '', /Only the designated requestee/i);
        // 5. Requestee resolves (+) successfully
        const requesteeResolveResult = validateFlagResolution(flag, reviewFlagType, 'user_dev2', 'developer', '+');
        assert.equal(requesteeResolveResult.valid, true);
        // 6. Admin can also resolve
        const adminResolveResult = validateFlagResolution(flag, reviewFlagType, 'user_admin', 'admin', '-');
        assert.equal(adminResolveResult.valid, true);
    });
    it('8. getAvailableTransitions filters correctly by current status and user role', () => {
        const devTransitionsFromInProgress = getAvailableTransitions(config, 'In Progress', 'developer');
        const targetStates = devTransitionsFromInProgress.map((t) => t.to);
        assert.ok(targetStates.includes('In Review'));
        assert.ok(targetStates.includes('Resolved'));
        const reporterTransitionsFromUnconfirmed = getAvailableTransitions(config, 'Unconfirmed', 'reporter');
        assert.equal(reporterTransitionsFromUnconfirmed.length, 0, 'Reporter cannot triage unconfirmed bugs');
        const triagerTransitionsFromUnconfirmed = getAvailableTransitions(config, 'Unconfirmed', 'triager');
        assert.ok(triagerTransitionsFromUnconfirmed.some((t) => t.to === 'Confirmed'));
    });
});
describe('Engine Flow Metrics & Stalled Detection', () => {
    it('Computes time in state correctly', () => {
        const createdAt = '2026-08-01T00:00:00Z';
        const activities = [
            {
                id: 1,
                bug_id: 1,
                actor_id: 'user1',
                field: 'status',
                old_value: 'Unconfirmed',
                new_value: 'In Progress',
                automated: false,
                created_at: '2026-08-03T00:00:00Z' // 2 days in Unconfirmed
            },
            {
                id: 2,
                bug_id: 1,
                actor_id: 'user1',
                field: 'status',
                old_value: 'In Progress',
                new_value: 'In Review',
                automated: false,
                created_at: '2026-08-04T00:00:00Z' // 1 day in In Progress
            }
        ];
        const now = new Date('2026-08-08T00:00:00Z'); // 4 days in In Review
        const timeInState = computeTimeInState(activities, createdAt, 'In Review', now);
        const twoDaysMs = 2 * 24 * 60 * 60 * 1000;
        const oneDayMs = 1 * 24 * 60 * 60 * 1000;
        const fourDaysMs = 4 * 24 * 60 * 60 * 1000;
        assert.equal(timeInState['Unconfirmed'], twoDaysMs);
        assert.equal(timeInState['In Progress'], oneDayMs);
        assert.equal(timeInState['In Review'], fourDaysMs);
    });
    it('Detects stalled segment when review? flag is open for > 24 hours', () => {
        const bug = {
            id: 412,
            title: 'Crash on save when offline',
            description: 'Reproduces offline',
            status: 'In Review',
            severity: 'critical',
            priority: 'high',
            component_id: 'core',
            reporter_id: 'user1',
            created_at: '2026-08-01T00:00:00Z',
            updated_at: '2026-08-05T00:00:00Z'
        };
        const flags = [
            {
                id: 99,
                type_id: 'ft_review',
                type_name: 'review?',
                bug_id: 412,
                status: '?',
                setter_id: 'sam',
                requestee_id: 'alex',
                requestee: { id: 'alex', username: 'alex', name: 'Alex River', email: 'alex@example.com', role: 'developer' },
                created_at: '2026-08-03T00:00:00Z'
            }
        ];
        const now = new Date('2026-08-07T01:00:00Z'); // 4d 1h later
        const stalled = detectStalledState(bug, [], flags, now);
        assert.equal(stalled.isStalled, true);
        assert.equal(stalled.stalledStage, 'In Review');
        assert.match(stalled.stalledReason || '', /waiting on review \(flag review\? → @Alex River\)/);
    });
    it('Detects sleeper branches when git branch is quiet for > 3 days while In Progress', () => {
        const bug = {
            id: 250,
            title: 'Refactor background queue',
            description: 'Async task runner',
            status: 'In Progress',
            severity: 'normal',
            priority: 'normal',
            component_id: 'core',
            reporter_id: 'user1',
            created_at: '2026-08-01T00:00:00Z',
            updated_at: '2026-08-05T00:00:00Z'
        };
        const gitLinks = [
            {
                id: 1,
                bug_id: 250,
                kind: 'BRANCH',
                ref: 'feat/async-queue',
                url: 'https://github.com/org/repo/tree/feat/async-queue',
                state: 'active',
                updated_at: '2026-08-02T00:00:00Z' // 4 days ago
            }
        ];
        const now = new Date('2026-08-06T12:00:00Z');
        const sleeper = detectSleeperBranches(bug, gitLinks, now);
        assert.equal(sleeper.hasSleeper, true);
        assert.equal(sleeper.branchRef, 'feat/async-queue');
    });
    it('Computes cumulative flow (CFD) point intervals accurately', () => {
        const bugs = [
            { id: 1, title: 'Bug 1', description: '', status: 'Resolved', severity: 'normal', priority: 'normal', component_id: 'core', reporter_id: 'u1', created_at: '2026-08-01T00:00:00Z', updated_at: '2026-08-05T00:00:00Z' },
            { id: 2, title: 'Bug 2', description: '', status: 'In Progress', severity: 'normal', priority: 'normal', component_id: 'core', reporter_id: 'u1', created_at: '2026-08-03T00:00:00Z', updated_at: '2026-08-05T00:00:00Z' }
        ];
        const activities = [
            { id: 1, bug_id: 1, actor_id: 'u1', field: 'status', old_value: null, new_value: 'Unconfirmed', automated: false, created_at: '2026-08-01T00:00:00Z' },
            { id: 2, bug_id: 1, actor_id: 'u1', field: 'status', old_value: 'Unconfirmed', new_value: 'Resolved', automated: false, created_at: '2026-08-04T00:00:00Z' },
            { id: 3, bug_id: 2, actor_id: 'u1', field: 'status', old_value: null, new_value: 'In Progress', automated: false, created_at: '2026-08-03T00:00:00Z' }
        ];
        const start = new Date('2026-08-01T00:00:00Z');
        const end = new Date('2026-08-05T00:00:00Z');
        const cfd = computeCumulativeFlow(bugs, activities, ['Unconfirmed', 'In Progress', 'Resolved'], start, end, 5);
        assert.equal(cfd.length, 6);
        const lastPoint = cfd[cfd.length - 1];
        assert.equal(lastPoint.counts['Resolved'], 1);
        assert.equal(lastPoint.counts['In Progress'], 1);
    });
});
describe('Engine Search Query Parser', () => {
    it('Parses complex search query string into structured filter', () => {
        const query = 'status:open priority:high assignee:alex milestone:v2.1 keyword:crash is:watched changedto:Resolved memory leak';
        const parsed = parseSearchQuery(query);
        assert.deepEqual(parsed.statuses, ['Unconfirmed', 'Confirmed', 'In Progress', 'In Review']);
        assert.deepEqual(parsed.priorities, ['high']);
        assert.deepEqual(parsed.assignees, ['alex']);
        assert.deepEqual(parsed.milestones, ['v2.1']);
        assert.deepEqual(parsed.keywords, ['crash']);
        assert.equal(parsed.isWatched, true);
        assert.equal(parsed.changedTo, 'Resolved');
        assert.deepEqual(parsed.text, ['memory', 'leak']);
    });
});
describe('Engine Relationship Validator', () => {
    it('Rejects self-blocking and circular blocking', () => {
        assert.equal(validateRelationship(10, 10, 'BLOCKS').valid, false);
        const existing = [
            { id: 1, from_bug_id: 10, to_bug_id: 20, type: 'BLOCKS', created_at: '' }
        ];
        // Bug 20 cannot block bug 10 (circular)
        const circular = validateRelationship(20, 10, 'BLOCKS', existing);
        assert.equal(circular.valid, false);
        assert.match(circular.reason || '', /circular dependency/i);
    });
});
describe('Engine SLA Targets & Activity Sparkline', () => {
    it('Calculates SLA status and detects review SLA breach for blocker/critical bugs', () => {
        const bug = {
            id: 412,
            title: 'Crash on save when offline',
            description: 'Reproduces offline',
            status: 'In Review',
            severity: 'critical', // critical SLA: review < 24h
            priority: 'high',
            component_id: 'core',
            reporter_id: 'user1',
            created_at: '2026-08-01T00:00:00Z',
            updated_at: '2026-08-05T00:00:00Z'
        };
        const flowMetrics = {
            bug_id: 412,
            time_in_state: { 'In Review': 36 * 3600 * 1000 }, // 36 hours in review
            stage_latencies: {
                triage_time_ms: 2 * 3600 * 1000,
                dev_time_ms: 10 * 3600 * 1000,
                review_latency_ms: 36 * 3600 * 1000, // 36h (> 24h SLA)
                verification_time_ms: 0
            },
            total_lead_time_ms: 48 * 3600 * 1000,
            is_stalled: true
        };
        const sla = computeSlaStatus(bug, flowMetrics);
        assert.equal(sla.is_breached, true);
        assert.equal(sla.breached_stage, 'Review');
        assert.equal(sla.breach_hours, 12); // 36 - 24 = 12h breach
    });
    it('Computes 14-day activity sparkline histogram correctly', () => {
        const now = new Date('2026-08-15T12:00:00Z');
        const activities = [
            { id: 1, bug_id: 1, actor_id: 'u1', field: 'status', old_value: null, new_value: 'Unconfirmed', automated: false, created_at: '2026-08-15T10:00:00Z' }, // today (day 13)
            { id: 2, bug_id: 1, actor_id: 'u1', field: 'status', old_value: 'Unconfirmed', new_value: 'In Progress', automated: false, created_at: '2026-08-15T11:00:00Z' }, // today (day 13)
            { id: 3, bug_id: 1, actor_id: 'u1', field: 'comment', old_value: null, new_value: 'Testing', automated: false, created_at: '2026-08-14T08:00:00Z' }, // yesterday (day 12)
        ];
        const sparkline = computeActivitySparkline(activities, 14, now);
        assert.equal(sparkline.length, 14);
        assert.equal(sparkline[13], 2); // 2 events today
        assert.equal(sparkline[12], 1); // 1 event yesterday
        assert.equal(sparkline[0], 0); // 0 events 14 days ago
    });
});
//# sourceMappingURL=engine.test.js.map
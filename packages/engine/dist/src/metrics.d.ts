import { Activity, Bug, BugSeverity, Flag, FlowMetrics, GitLink, SlaStatus, SlaTarget } from '@triarc/shared-types';
export declare function computeTimeInState(activities: Activity[], createdAt: string, currentState: string, now?: Date): Record<string, number>;
export declare function detectStalledState(bug: Bug, activities: Activity[], flags: Flag[], now?: Date): {
    isStalled: boolean;
    stalledStage?: string;
    stalledDurationMs?: number;
    stalledReason?: string;
    stalledFlagId?: number;
    stalledFlagRequestee?: string;
};
export declare function detectSleeperBranches(bug: Bug, gitLinks: GitLink[], now?: Date): {
    hasSleeper: boolean;
    branchRef?: string;
    quietSince?: string;
};
export declare function deriveFlowMetrics(bug: Bug, activities: Activity[], flags?: Flag[], gitLinks?: GitLink[], now?: Date): FlowMetrics;
export declare const DEFAULT_SLA_TARGETS: Record<BugSeverity, SlaTarget>;
export declare function computeSlaStatus(bug: Bug, flowMetrics: FlowMetrics, targets?: Record<BugSeverity, SlaTarget>): SlaStatus;
export declare function computeActivitySparkline(activities: Activity[], days?: number, now?: Date): number[];
export declare function computeCumulativeFlow(bugs: Bug[], activities: Activity[], states: string[], startDate: Date, endDate: Date, steps?: number): {
    timestamp: string;
    counts: Record<string, number>;
}[];
//# sourceMappingURL=metrics.d.ts.map
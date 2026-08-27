export type UserRole = 'reporter' | 'developer' | 'triager' | 'admin' | 'security';
export interface User {
    id: string;
    username: string;
    name: string;
    email: string;
    role: UserRole;
    avatar_url?: string;
}
export interface Group {
    id: string;
    name: string;
    description?: string;
}
export type BugStatus = 'Unconfirmed' | 'Confirmed' | 'In Progress' | 'In Review' | 'Resolved' | 'Verified' | 'Closed' | 'Duplicate' | 'WontFix';
export type BugSeverity = 'blocker' | 'critical' | 'major' | 'normal' | 'minor' | 'trivial' | 'enhancement';
export type BugPriority = 'highest' | 'high' | 'normal' | 'low' | 'lowest';
export interface Bug {
    id: number;
    title: string;
    description: string;
    status: BugStatus;
    severity: BugSeverity;
    priority: BugPriority;
    component_id: string;
    component_name?: string;
    reporter_id: string;
    reporter?: User;
    assignee_id?: string | null;
    assignee?: User | null;
    resolution?: string | null;
    duplicate_of?: number | null;
    security_group_id?: string | null;
    time_in_state_json?: string | null;
    created_at: string;
    updated_at: string;
    flags?: Flag[];
    relationships?: Relationship[];
    git_links?: GitLink[];
    comments_count?: number;
}
export interface Activity {
    id: number;
    bug_id: number;
    actor_id: string | null;
    actor_name?: string | null;
    field: string;
    old_value: string | null;
    new_value: string | null;
    automated: boolean | number;
    created_at: string;
}
export type FlagStatus = '?' | '+' | '-';
export type FlagTarget = 'bug' | 'attachment';
export interface FlagType {
    id: string;
    name: string;
    target: FlagTarget;
    is_requestable: boolean | number;
    is_requesteeble: boolean | number;
    grant_role: UserRole;
    request_role: UserRole;
}
export interface Flag {
    id: number;
    type_id: string;
    type_name?: string;
    bug_id: number;
    attach_id?: number | null;
    status: FlagStatus;
    setter_id: string;
    setter?: User;
    requestee_id?: string | null;
    requestee?: User | null;
    created_at: string;
    resolved_at?: string | null;
    bug_title?: string;
    bug_status?: BugStatus;
}
export type RelationshipType = 'BLOCKS' | 'DEPENDS_ON' | 'DUPLICATE_OF' | 'RELATED_TO';
export interface Relationship {
    id: number;
    from_bug_id: number;
    to_bug_id: number;
    type: RelationshipType;
    created_at: string;
    target_bug_title?: string;
    target_bug_status?: BugStatus;
}
export interface Comment {
    id: number;
    bug_id: number;
    author_id: string;
    author?: User;
    body: string;
    is_private: boolean | number;
    created_at: string;
}
export interface Attachment {
    id: number;
    bug_id: number;
    uploader_id: string;
    uploader?: User;
    filename: string;
    file_path: string;
    mime_type: string;
    size_bytes: number;
    is_private: boolean | number;
    created_at: string;
}
export type GitLinkKind = 'BRANCH' | 'PR' | 'COMMIT';
export interface GitLink {
    id: number;
    bug_id: number;
    kind: GitLinkKind;
    ref: string;
    url: string;
    state: string;
    updated_at: string;
}
export interface GitHubEvent {
    kind: 'commit' | 'pull_request' | 'pull_request_review';
    action?: string;
    ref?: string;
    commit_hash?: string;
    commit_message?: string;
    pr_number?: number;
    pr_title?: string;
    pr_state?: string;
    review_state?: 'approved' | 'changes_requested' | 'commented';
    author: string;
    url?: string;
    bug_id?: number;
}
export interface WorkflowGuard {
    requireComment?: boolean;
    requireFields?: string[];
    customRule?: string;
}
export interface WorkflowTransition {
    from: string | '*';
    to: string;
    roles: UserRole[];
    automatable?: boolean;
    guards?: WorkflowGuard;
}
export interface WorkflowConfig {
    projectId: string;
    states: string[];
    initial: string;
    transitions: WorkflowTransition[];
}
export interface TransitionValidationResult {
    valid: boolean;
    reason?: string;
    transition?: WorkflowTransition;
}
export interface FlowMetrics {
    bug_id: number;
    time_in_state: Record<string, number>;
    stage_latencies: {
        triage_time_ms: number;
        dev_time_ms: number;
        review_latency_ms: number;
        verification_time_ms: number;
    };
    total_lead_time_ms: number;
    is_stalled: boolean;
    stalled_stage?: string;
    stalled_duration_ms?: number;
    stalled_reason?: string;
    stalled_flag_id?: number;
    stalled_flag_requestee?: string;
    has_sleeper_branch?: boolean;
    sleeper_branch_ref?: string;
    sleeper_branch_quiet_since?: string;
}
export interface TimelineItem {
    id: string;
    timestamp: string;
    type: 'activity' | 'git_event';
    title: string;
    description?: string;
    actor_id?: string | null;
    actor_name?: string | null;
    automated?: boolean;
    meta?: {
        field?: string;
        old_value?: string | null;
        new_value?: string | null;
        git_kind?: GitLinkKind;
        git_ref?: string;
        git_url?: string;
        git_state?: string;
    };
}
export interface DuplicateMatch {
    bug_id: number;
    title: string;
    status: BugStatus;
    similarity_score: number;
}
export interface PresenceEvent {
    bug_id: number;
    active_viewers: {
        user_id: string;
        username: string;
        name: string;
        last_seen: string;
    }[];
}
export type SSEEventType = 'bug:updated' | 'bug:created' | 'activity:created' | 'flag:created' | 'flag:resolved' | 'presence:changed';
export interface SSEMessage {
    type: SSEEventType;
    data: any;
    timestamp: string;
}
export interface CreateBugInput {
    title: string;
    description: string;
    severity?: BugSeverity;
    priority?: BugPriority;
    component_id: string;
    assignee_id?: string | null;
    security_group_id?: string | null;
}
export interface TransitionBugInput {
    toState: string;
    comment?: string;
    fields?: Record<string, any>;
    automated?: boolean;
}
export interface CreateFlagInput {
    type_id: string;
    requestee_id?: string | null;
    attach_id?: number | null;
}
export interface ResolveFlagInput {
    status: '+' | '-';
    comment?: string;
}
//# sourceMappingURL=index.d.ts.map
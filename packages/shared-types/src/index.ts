export type UserRole = 'reporter' | 'developer' | 'triager' | 'admin' | 'security';

export interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  role: UserRole;
  avatar_url?: string;
  security_group_ids?: string[];
  is_external?: boolean;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
}

export interface Project {
  id: string;
  key: string;
  name: string;
  description?: string;
  department_id?: string;
  repo_url?: string;
  created_at: string;
  // Computed / hydrated fields
  open_bugs_count?: number;
  assigned_to_me_count?: number;
  stalled_bugs_count?: number;
  user_role?: UserRole;
  health_status?: 'HEALTHY' | 'STALLED' | 'AT_RISK';
}

export interface ProjectMember {
  project_id: string;
  user_id: string;
  role: UserRole;
  user?: User;
}

export interface ProjectAttentionSummary {
  assigned_to_me: number;
  incoming_requests: number;
  watching_changed: number;
}

export interface CreateProjectInput {
  id?: string;
  key: string;
  name: string;
  description?: string;
  department_id?: string;
  repo_url?: string;
}

export interface Component {
  id: string;
  name: string;
  description?: string;
  project_id?: string;
}

export interface Keyword {
  id: string;
  name: string;
  description?: string;
}

export interface Milestone {
  id: string;
  product_id: string;
  name: string;
  due_date?: string;
  open_bugs_count?: number;
  closed_bugs_count?: number;
}

export interface Version {
  id: string;
  product_id: string;
  name: string;
}

export interface Watcher {
  bug_id: number;
  user_id: string;
  created_at: string;
  user?: User;
}

export interface SavedSearch {
  id: string;
  user_id: string;
  name: string;
  query: string;
  created_at: string;
}

export type NotificationType = 'status_change' | 'flag_assigned' | 'flag_resolved' | 'comment_added' | 'watcher_activity';

export interface Notification {
  id: number;
  user_id: string;
  bug_id: number;
  type: NotificationType | string;
  message: string;
  read: boolean | number;
  created_at: string;
  bug_title?: string;
}

export type BugStatus =
  | 'Unconfirmed'
  | 'Confirmed'
  | 'In Progress'
  | 'In Review'
  | 'Resolved'
  | 'Verified'
  | 'Closed'
  | 'Duplicate'
  | 'WontFix';

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
  project_id?: string;
  project_key?: string;
  reporter_id: string;
  reporter?: User;
  assignee_id?: string | null;
  assignee?: User | null;
  resolution?: string | null;
  duplicate_of?: number | null;
  security_group_id?: string | null;
  time_in_state_json?: string | null;
  version?: string | null;
  target_milestone?: string | null;
  estimated_time?: number | null;
  remaining_time?: number | null;
  created_at: string;
  updated_at: string;
  // Hydrated fields
  flags?: Flag[];
  relationships?: Relationship[];
  git_links?: GitLink[];
  comments_count?: number;
  activity_sparkline?: number[];
  sla_status?: SlaStatus;
  keywords?: Keyword[];
  watchers?: User[];
  is_watched?: boolean;
}

export interface Activity {
  id: number;
  bug_id: number;
  actor_id: string | null; // null represents system/automated action
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
  // Contextual helper fields for Inbox
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
  work_time?: number | null;
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
  state: string; // 'open' | 'closed' | 'merged' | 'active' | 'stale'
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

// Workflow Config (§8)
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
  time_in_state: Record<string, number>; // state -> milliseconds
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

export type SSEEventType =
  | 'bug:updated'
  | 'bug:created'
  | 'activity:created'
  | 'flag:created'
  | 'flag:resolved'
  | 'git:linked'
  | 'git:commit'
  | 'presence:changed'
  | 'presence:ping'
  | 'notification:created'
  | 'admin:user_updated'
  | 'import:progress'
  | 'import:complete';


export interface SSEMessage {
  type: SSEEventType;
  data: any;
  timestamp: string;
}

export interface SlaTarget {
  triage_hours: number;
  dev_hours: number;
  review_hours: number;
}

export interface SlaStatus {
  severity: BugSeverity;
  targets: SlaTarget;
  is_breached: boolean;
  breached_stage?: 'Triage' | 'Dev' | 'Review';
  breach_hours?: number;
  remaining_hours?: number;
  compliance_percent?: number;
}

export interface DigestItem {
  id: number;
  bug_id: number;
  bug_title: string;
  field: string;
  old_value: string | null;
  new_value: string | null;
  actor_name?: string;
  created_at: string;
}

export interface DigestSummary {
  since: string;
  period_label: string;
  status_changes_count: number;
  new_flags_count: number;
  comments_count: number;
  total_events: number;
  items: DigestItem[];
}

export interface BulkTransitionInput {
  bug_ids: number[];
  toState: string;
  comment?: string;
  fields?: Record<string, any>;
}

export interface BulkTransitionResult {
  total: number;
  success_count: number;
  failed_count: number;
  results: {
    bug_id: number;
    title?: string;
    success: boolean;
    old_status?: string;
    new_status?: string;
    reason?: string;
  }[];
}

export interface CreateBugInput {
  title: string;
  description: string;
  severity?: BugSeverity;
  priority?: BugPriority;
  component_id: string;
  project_id?: string;
  assignee_id?: string | null;
  security_group_id?: string | null;
  version?: string | null;
  target_milestone?: string | null;
  estimated_time?: number | null;
  keyword_ids?: string[];
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

export interface UpdateBugInput {
  title?: string;
  description?: string;
  severity?: BugSeverity;
  priority?: BugPriority;
  component_id?: string;
  assignee_id?: string | null;
  version?: string | null;
  target_milestone?: string | null;
  estimated_time?: number | null;
  remaining_time?: number | null;
}

// Administration types (W10.4)
export interface AdminUserUpdateInput {
  role?: UserRole;
  security_group_ids?: string[];
  is_external?: boolean;
}

export interface AdminComponentInput {
  id: string;
  name: string;
  description?: string;
  default_assignee_id?: string | null;
}

export interface AdminMilestoneInput {
  id?: string;
  name: string;
  due_date?: string | null;
  product_id?: string;
}

export interface AdminVersionInput {
  id?: string;
  name: string;
  product_id?: string;
}

// GitHub Importer types (W9)
export interface GitHubImportInput {
  repoUrl: string;
  maxIssues?: number;
  githubToken?: string;
  useFixture?: boolean;
  fixtureName?: string;
}

export interface ImportedRepo {
  id: number;
  url: string;
  owner: string;
  name: string;
  issue_count: number;
  imported_at: string;
}

export interface ImportProgressEvent {
  job_id: string;
  stage: 'fetching' | 'mapping' | 'saving' | 'complete' | 'error';
  current: number;
  total: number;
  message: string;
  repo_name?: string;
}

export interface GitCommit {
  sha: string;
  short_sha: string;
  message: string;
  author_name: string;
  author_username: string;
  author_avatar?: string;
  branch: string;
  created_at: string;
  url: string;
  bug_id?: number;
  bug_title?: string;
  /** Parent SHAs. Two or more parents means this commit is a merge. */
  parents?: string[];
}

export interface CollaboratorTelemetry {
  id: string;
  username: string;
  name: string;
  avatar_url?: string;
  role: string;
  commits_count: number;
  prs_count: number;
  active_branch?: string;
  current_status: string;
  last_activity_at: string;
}

export interface ProjectGitTelemetry {
  repo_url: string;
  commits: GitCommit[];
  collaborators: CollaboratorTelemetry[];
  branches: {
    name: string;
    is_default: boolean;
    is_sleeper: boolean;
    last_commit_at: string;
    author: string;
  }[];
  stats: {
    total_commits: number;
    total_collaborators: number;
    active_branches: number;
    open_prs: number;
  };
}

// -------------------------------------------------------------
// Commit graph — the network view of a repository
//
// Lanes are assigned server-side so the client only has to draw:
// lane 0 is always the default branch (the trunk), and every other
// branch gets its own lane, diverging from the trunk at its first
// commit and optionally merging back.
// -------------------------------------------------------------

export interface GitGraphNode {
  sha: string;
  short_sha: string;
  message: string;
  author_name: string;
  author_username: string;
  author_avatar?: string;
  branch: string;
  created_at: string;
  url: string;
  bug_id?: number;
  bug_title?: string;
  /** Horizontal lane. 0 is the default branch. */
  lane: number;
  /** Position along the time axis, ascending from the oldest commit. */
  index: number;
  /** True when this commit brought a branch back into the trunk. */
  is_merge: boolean;
}

export interface GitGraphLane {
  /** Branch name occupying this lane. */
  branch: string;
  lane: number;
  is_default: boolean;
  /** No commits for over 3 days while still unmerged. */
  is_sleeper: boolean;
  is_merged: boolean;
  /** Index of the trunk commit this branch diverged from, null for the trunk. */
  branched_from_index: number | null;
  /** Index of the commit that merged it back, null while still open. */
  merged_at_index: number | null;
  first_commit_at: string;
  last_commit_at: string;
  commit_count: number;
  author: string;
}

export interface GitGraph {
  repo_url: string;
  default_branch: string;
  /** Oldest first, so index maps directly onto the time axis. */
  nodes: GitGraphNode[];
  lanes: GitGraphLane[];
  /** True when this came from the live GitHub API rather than local data. */
  is_live: boolean;
  stats: {
    total_commits: number;
    total_branches: number;
    open_branches: number;
    sleeper_branches: number;
    contributors: number;
    spans_days: number;
  };
}


import {
  Bug,
  Activity,
  Flag,
  FlagType,
  Relationship,
  GitLink,
  Comment,
  FlowMetrics,
  WorkflowTransition,
  TimelineItem,
  DuplicateMatch,
  User,
  Project,
  ProjectMember,
  ProjectAttentionSummary,
  CreateProjectInput,
  Component,
  CreateBugInput,
  TransitionBugInput,
  CreateFlagInput,
  ResolveFlagInput,
  GitGraph
} from '@triarc/shared-types';

const API_BASE = '/api';

let activeToken: string | null = typeof localStorage !== 'undefined' ? localStorage.getItem('triarc_token') : null;

export function setAuthToken(token: string | null) {
  activeToken = token;
  if (typeof localStorage !== 'undefined') {
    if (token) {
      localStorage.setItem('triarc_token', token);
    } else {
      localStorage.removeItem('triarc_token');
    }
  }
}

export function getAuthToken(): string | null {
  return activeToken;
}

function getHeaders(token?: string, userId?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  const tokenToUse = token || activeToken;
  if (tokenToUse) {
    headers['Authorization'] = `Bearer ${tokenToUse}`;
  }
  if (userId) {
    headers['x-user-id'] = userId;
  }
  return headers;
}

// -------------------------------------------------------------
// Central request layer
//
// Every call below goes through `request()` so that headers, error
// shape, and expired-session handling are defined in exactly one place.
// -------------------------------------------------------------

/** Error carrying the API's own status/code so callers can branch on it. */
export class ApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

type UnauthorizedHandler = () => void;

let unauthorizedHandler: UnauthorizedHandler | null = null;

/**
 * Registered by AuthContext so an expired session can be handled inside React
 * (clear user, open login) instead of a hard page navigation.
 */
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  unauthorizedHandler = handler;
}

function handleUnauthorized() {
  setAuthToken(null);

  if (unauthorizedHandler) {
    unauthorizedHandler();
    return;
  }
}


type QueryValue = string | number | boolean | undefined | null;

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, QueryValue>;
  userId?: string;
  token?: string;
  /** Message used when the server sends no `error` field. */
  fallback?: string;
  /**
   * Auth endpoints must opt out: a 401 there means "bad credentials",
   * not "your session expired", and must not trigger a global logout.
   */
  skipAuthRedirect?: boolean;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, query, userId, token, fallback, skipAuthRedirect } = options;

  let url = `${API_BASE}${path}`;
  if (query) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        params.set(key, String(value));
      }
    }
    const qs = params.toString();
    if (qs) url += `?${qs}`;
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: getHeaders(token, userId),
      ...(body !== undefined ? { body: JSON.stringify(body) } : {})
    });
  } catch {
    throw new ApiError('Network error — the Triarc API is unreachable.', 0, 'NETWORK_ERROR');
  }

  // Tolerate empty bodies (204, DELETE) without throwing on JSON.parse.
  const text = await res.text();
  let data: any = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    if (res.status === 401 && !skipAuthRedirect) {
      handleUnauthorized();
    }
    throw new ApiError(
      data?.error || fallback || `Request failed (${res.status})`,
      res.status,
      data?.code,
      data?.details
    );
  }

  return data as T;
}

export async function fetchUsers(): Promise<User[]> {
  const data = await request<{ users: User[] }>('/users', { fallback: 'Failed to fetch users' });
  return data.users;
}

// Projects API
export async function fetchProjects(userId?: string): Promise<Project[]> {
  const data = await request<{ projects: Project[] }>('/projects', {
    userId,
    fallback: 'Failed to fetch projects'
  });
  return data.projects || [];
}

export async function fetchAttentionCounts(userId?: string): Promise<ProjectAttentionSummary> {
  return request<ProjectAttentionSummary>('/projects/attention', {
    userId,
    fallback: 'Failed to fetch attention counts'
  });
}

export async function fetchProjectByKey(key: string, userId?: string): Promise<{
  project: Project;
  components: Component[];
  members: ProjectMember[];
}> {
  return request(`/projects/${key}`, {
    userId,
    fallback: `Failed to fetch project ${key}`
  });
}

export async function createProject(input: CreateProjectInput, userId?: string): Promise<Project> {
  const data = await request<{ project: Project }>('/projects', {
    method: 'POST',
    body: input,
    userId,
    fallback: 'Failed to create project'
  });
  return data.project;
}

export async function updateProject(
  key: string,
  data: { name?: string; description?: string; repo_url?: string },
  userId?: string
): Promise<Project> {
  const result = await request<{ project: Project }>(`/projects/${key}`, {
    method: 'PATCH',
    body: data,
    userId,
    fallback: 'Failed to update project'
  });
  return result.project;
}

export async function addProjectComponent(
  key: string,
  data: { id: string; name: string; description?: string },
  userId?: string
): Promise<any> {
  return request(`/projects/${key}/components`, {
    method: 'POST',
    body: data,
    userId,
    fallback: 'Failed to add component'
  });
}

export async function updateProjectMember(
  key: string,
  data: { user_id: string; member_role: string },
  userId?: string
): Promise<any> {
  return request(`/projects/${key}/members`, {
    method: 'POST',
    body: data,
    userId,
    fallback: 'Failed to update project member'
  });
}

export async function removeProjectMember(
  key: string,
  userIdToRemove: string,
  userId?: string
): Promise<any> {
  return request(`/projects/${key}/members/${userIdToRemove}`, {
    method: 'DELETE',
    userId,
    fallback: 'Failed to remove project member'
  });
}

export async function fetchBugs(params?: {
  project?: string;
  project_id?: string;
  query?: string;
  status?: string;
  priority?: string;
  severity?: string;
  component?: string;
  assignee?: string;
  userId?: string;
}): Promise<{ bugs: Bug[]; count: number }> {
  return request('/bugs', {
    userId: params?.userId,
    fallback: 'Failed to fetch bugs',
    query: {
      project: params?.project,
      project_id: params?.project_id,
      query: params?.query,
      status: params?.status,
      priority: params?.priority,
      severity: params?.severity,
      component: params?.component,
      assignee: params?.assignee
    }
  });
}

export async function fetchBugDetail(bugId: number | string, userId?: string): Promise<{
  bug: Bug;
  flags: Flag[];
  relationships: Relationship[];
  git_links: GitLink[];
  comments: Comment[];
  activity: Activity[];
  flow_metrics: FlowMetrics;
  available_transitions: WorkflowTransition[];
  viewers: { user_id: string; username: string; name: string }[];
}> {
  return request(`/bugs/${bugId}`, {
    userId,
    fallback: `Failed to fetch bug #${bugId}`
  });
}

export async function createBug(input: CreateBugInput, userId?: string): Promise<{ id: number; duplicates: DuplicateMatch[] }> {
  return request('/bugs', {
    method: 'POST',
    body: input,
    userId,
    fallback: 'Failed to create bug'
  });
}

export async function checkDuplicates(title: string, description?: string, excludeBugId?: number, userId?: string): Promise<DuplicateMatch[]> {
  // Radar is advisory: a failure must never block the user from filing.
  try {
    const data = await request<{ duplicates: DuplicateMatch[] }>('/duplicates/check', {
      method: 'POST',
      body: { title, description, excludeBugId },
      userId
    });
    return data.duplicates || [];
  } catch {
    return [];
  }
}

export async function transitionBug(bugId: number, input: TransitionBugInput, userId?: string): Promise<any> {
  return request(`/bugs/${bugId}/transition`, {
    method: 'PATCH',
    body: input,
    userId,
    fallback: 'Failed to transition bug status'
  });
}

export async function relateBug(bugId: number, toBugId: number, type: string, userId?: string): Promise<any> {
  return request(`/bugs/${bugId}/relate`, {
    method: 'POST',
    body: { toBugId, type },
    userId,
    fallback: 'Failed to link relationship'
  });
}

export async function fetchKeywords(): Promise<{ keywords: any[] }> {
  return request('/keywords', { fallback: 'Failed to fetch keywords' });
}

export async function fetchMilestones(): Promise<{ milestones: any[] }> {
  return request('/milestones', { fallback: 'Failed to fetch milestones' });
}

export async function fetchVersions(): Promise<{ versions: any[] }> {
  return request('/versions', { fallback: 'Failed to fetch versions' });
}

export async function watchBug(bugId: number, userId?: string): Promise<any> {
  return request(`/bugs/${bugId}/watch`, {
    method: 'POST',
    userId,
    fallback: 'Failed to watch bug'
  });
}

export async function unwatchBug(bugId: number, userId?: string): Promise<any> {
  return request(`/bugs/${bugId}/watch`, {
    method: 'DELETE',
    userId,
    fallback: 'Failed to unwatch bug'
  });
}

export async function addBugKeyword(bugId: number, keyword_id: string, userId?: string): Promise<any> {
  return request(`/bugs/${bugId}/keywords`, {
    method: 'POST',
    body: { keyword_id },
    userId,
    fallback: 'Failed to add keyword'
  });
}

export async function removeBugKeyword(bugId: number, keywordId: string, userId?: string): Promise<any> {
  return request(`/bugs/${bugId}/keywords/${keywordId}`, {
    method: 'DELETE',
    userId,
    fallback: 'Failed to remove keyword'
  });
}

export async function fetchSavedSearches(userId?: string): Promise<{ saved_searches: any[] }> {
  return request('/saved-searches', {
    userId,
    fallback: 'Failed to fetch saved searches'
  });
}

export async function createSavedSearch(name: string, query: string, userId?: string): Promise<any> {
  return request('/saved-searches', {
    method: 'POST',
    body: { name, query },
    userId,
    fallback: 'Failed to create saved search'
  });
}

export async function deleteSavedSearch(id: string, userId?: string): Promise<any> {
  return request(`/saved-searches/${id}`, {
    method: 'DELETE',
    userId,
    fallback: 'Failed to delete saved search'
  });
}

export async function fetchNotifications(unreadOnly: boolean = false, userId?: string): Promise<{ notifications: any[]; unread_count: number }> {
  return request('/notifications', {
    userId,
    query: { unread: unreadOnly ? 'true' : undefined },
    fallback: 'Failed to fetch notifications'
  });
}

export async function markNotificationRead(id: number, userId?: string): Promise<any> {
  return request(`/notifications/${id}/read`, {
    method: 'PATCH',
    userId,
    fallback: 'Failed to mark notification read'
  });
}

export async function markAllNotificationsRead(userId?: string): Promise<any> {
  return request('/notifications/read-all', {
    method: 'POST',
    userId,
    fallback: 'Failed to mark all notifications read'
  });
}

export async function addComment(bugId: number, body: string, is_private: boolean = false, work_time: number = 0, userId?: string): Promise<any> {
  return request(`/bugs/${bugId}/comments`, {
    method: 'POST',
    body: { body, is_private, work_time },
    userId,
    fallback: 'Failed to post comment'
  });
}

export async function fetchInbox(userId?: string): Promise<{
  incoming: Flag[];
  outgoing: Flag[];
  resolved: Flag[];
  // The API returns arrays plus a pending total — there is no `counts` object.
  // Callers must derive counts from the array lengths.
  total_pending: number;
}> {
  return request('/inbox', {
    userId,
    fallback: 'Failed to fetch Request Inbox'
  });
}

export async function createFlag(bugId: number, input: CreateFlagInput, userId?: string): Promise<any> {
  return request(`/bugs/${bugId}/flags`, {
    method: 'POST',
    body: input,
    userId,
    fallback: 'Failed to request flag'
  });
}

export async function resolveFlag(flagId: number, input: ResolveFlagInput, userId?: string): Promise<any> {
  return request(`/flags/${flagId}`, {
    method: 'PATCH',
    body: input,
    userId,
    fallback: 'Failed to resolve flag'
  });
}

export async function fetchFlowAnalytics(days: number = 30, userId?: string, project?: string): Promise<any> {
  return request('/analytics/flow', {
    userId,
    query: { days, project },
    fallback: 'Failed to fetch flow analytics'
  });
}

export async function sendPresenceHeartbeat(bugId: number, userId?: string): Promise<any> {
  // Presence is decorative — never surface a failure to the user.
  try {
    return await request('/presence/heartbeat', {
      method: 'POST',
      body: { bugId },
      userId
    });
  } catch {
    return null;
  }
}

export async function simulateWebhook(payload: {

  type: 'commit' | 'pr_open' | 'pr_review' | 'pr_merge';
  bugId: number;
  message?: string;
  author?: string;
  prNumber?: number;
  branchName?: string;
}): Promise<any> {
  return request('/webhooks/simulate', {
    method: 'POST',
    body: payload,
    fallback: 'Failed to simulate webhook'
  });
}

export async function fetchDigest(since?: string, userId?: string): Promise<any> {
  return request('/digest', {
    userId,
    query: { since },
    fallback: 'Failed to fetch notifications digest'
  });
}

export async function fetchActivityHeatmap(days: number = 90, userId?: string): Promise<any> {
  return request('/analytics/activity-heatmap', {
    userId,
    query: { days },
    fallback: 'Failed to fetch activity heatmap'
  });
}

export async function updateBug(bugId: number, input: any, userId?: string): Promise<any> {
  return request(`/bugs/${bugId}`, {
    method: 'PATCH',
    body: input,
    userId,
    fallback: 'Failed to update bug'
  });
}

export async function bulkTransitionBugs(input: any, userId?: string): Promise<any> {
  return request('/bugs/bulk-transition', {
    method: 'POST',
    body: input,
    userId,
    fallback: 'Failed to execute bulk transition'
  });
}

export function exportFlowReportAsHtml(bugDetail: any): void {
  const bug = bugDetail.bug;
  const metrics = bugDetail.flow_metrics;
  const sla = bugDetail.sla_status;
  const activity = bugDetail.activity || [];
  const flags = bugDetail.flags || [];
  const gitLinks = bugDetail.git_links || [];

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Triarc Flow Report — Bug #${bug.id}: ${escapeHtml(bug.title)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0b0f17; color: #e2e8f0; margin: 0; padding: 40px; line-height: 1.5; }
    .container { max-width: 960px; margin: 0 auto; background: #131b2e; border: 1px solid #2d3748; border-radius: 16px; padding: 32px; box-shadow: 0 20px 40px rgba(0,0,0,0.6); }
    .header { border-bottom: 1px solid #2d3748; padding-bottom: 20px; margin-bottom: 24px; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; font-family: monospace; }
    .badge-status { background: #1e293b; color: #38bdf8; border: 1px solid #0284c7; }
    .badge-sla { background: #450a0a; color: #fca5a5; border: 1px solid #ef4444; }
    .badge-ok { background: #064e3b; color: #6ee7b7; border: 1px solid #10b981; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .card { background: #1e293b; border: 1px solid #334155; border-radius: 10px; padding: 16px; }
    .card-label { font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; margin-bottom: 4px; }
    .card-val { font-size: 18px; font-weight: 700; font-family: monospace; color: #f8fafc; }
    .section-title { font-size: 14px; font-weight: 700; color: #38bdf8; text-transform: uppercase; margin-top: 32px; margin-bottom: 12px; border-bottom: 1px solid #1e293b; padding-bottom: 6px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 8px; }
    th { text-align: left; background: #1e293b; color: #94a3b8; padding: 10px 12px; font-weight: 600; border-bottom: 1px solid #334155; }
    td { padding: 10px 12px; border-bottom: 1px solid #1e293b; color: #cbd5e1; }
    tr:hover td { background: #1a2333; }
    .timeline-node { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
    .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #64748b; font-family: monospace; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <span style="font-family: monospace; font-size: 14px; color: #38bdf8; font-weight: 700;">TRIARC FLOW & POST-MORTEM REPORT</span>
        <span class="badge badge-status">${escapeHtml(bug.status)}</span>
      </div>
      <h1 style="margin: 0 0 12px 0; font-size: 24px; color: #fff;">#${bug.id} — ${escapeHtml(bug.title)}</h1>
      <p style="margin: 0; color: #94a3b8; font-size: 13px;">${escapeHtml(bug.description || 'No description provided')}</p>
    </div>

    <div class="grid">
      <div class="card">
        <div class="card-label">Severity / Priority</div>
        <div class="card-val" style="text-transform: capitalize;">${bug.severity} / ${bug.priority}</div>
      </div>
      <div class="card">
        <div class="card-label">Component</div>
        <div class="card-val">${escapeHtml(bug.component_id)}</div>
      </div>
      <div class="card">
        <div class="card-label">Assignee</div>
        <div class="card-val">${escapeHtml(bug.assignee?.name || 'Unassigned')}</div>
      </div>
      <div class="card">
        <div class="card-label">Total Lead Time</div>
        <div class="card-val">${Math.round((metrics?.total_lead_time_ms || 0) / (3600 * 1000))}h</div>
      </div>
      <div class="card">
        <div class="card-label">SLA Compliance</div>
        <div class="card-val">
          <span class="badge ${sla?.is_breached ? 'badge-sla' : 'badge-ok'}">${sla?.is_breached ? 'BREACHED (+' + sla.breach_hours + 'h)' : 'COMPLIANT'}</span>
        </div>
      </div>
    </div>

    <div class="section-title">Flow Stage Breakdown</div>
    <div class="grid">
      <div class="card">
        <div class="card-label">Triage Time</div>
        <div class="card-val">${Math.round((metrics?.stage_latencies?.triage_time_ms || 0) / (3600 * 1000))}h</div>
      </div>
      <div class="card">
        <div class="card-label">Dev Time</div>
        <div class="card-val">${Math.round((metrics?.stage_latencies?.dev_time_ms || 0) / (3600 * 1000))}h</div>
      </div>
      <div class="card">
        <div class="card-label">Review Latency</div>
        <div class="card-val">${Math.round((metrics?.stage_latencies?.review_latency_ms || 0) / (3600 * 1000))}h</div>
      </div>
      <div class="card">
        <div class="card-label">Verification Time</div>
        <div class="card-val">${Math.round((metrics?.stage_latencies?.verification_time_ms || 0) / (3600 * 1000))}h</div>
      </div>
    </div>

    ${metrics?.is_stalled ? `
      <div style="background: #450a0a; border: 1px solid #ef4444; padding: 16px; border-radius: 10px; margin: 20px 0;">
        <strong style="color: #fca5a5;">⚠️ Bottleneck Warning:</strong>
        <span style="color: #fecaca; margin-left: 8px;">${escapeHtml(metrics.stalled_reason || 'Item stalled in workflow')}</span>
      </div>
    ` : ''}

    <div class="section-title">Request Flags (${flags.length})</div>
    <table>
      <thead>
        <tr><th>Type</th><th>Status</th><th>Setter</th><th>Requestee</th><th>Created</th><th>Resolved</th></tr>
      </thead>
      <tbody>
        ${flags.map((f: any) => `
          <tr>
            <td><strong>${escapeHtml(f.type_name || f.type_id)}</strong></td>
            <td><span class="badge ${f.status === '+' ? 'badge-ok' : f.status === '-' ? 'badge-sla' : 'badge-status'}">${f.status}</span></td>
            <td>@${escapeHtml(f.setter?.username || f.setter_id)}</td>
            <td>${f.requestee ? '@' + escapeHtml(f.requestee.username) : '—'}</td>
            <td>${f.created_at}</td>
            <td>${f.resolved_at || 'Pending'}</td>
          </tr>
        `).join('')}
        ${flags.length === 0 ? '<tr><td colspan="6" style="text-align:center; color:#64748b;">No flags attached.</td></tr>' : ''}
      </tbody>
    </table>

    <div class="section-title">Audit Log Trail (${activity.length} Events)</div>
    <table>
      <thead>
        <tr><th>Timestamp</th><th>Actor</th><th>Field</th><th>Old Value</th><th>New Value</th><th>Type</th></tr>
      </thead>
      <tbody>
        ${activity.map((a: any) => `
          <tr>
            <td style="font-family: monospace;">${a.created_at}</td>
            <td>${escapeHtml(a.actor_name || (a.automated ? 'System (Automated)' : 'User'))}</td>
            <td><code>${escapeHtml(a.field)}</code></td>
            <td>${escapeHtml(a.old_value || '—')}</td>
            <td><strong>${escapeHtml(a.new_value || '—')}</strong></td>
            <td>${a.automated ? '<span class="badge badge-status">Automated</span>' : 'Manual'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="footer">
      Generated by Triarc ⚡ Engineering Momentum Engine · Report exported on ${new Date().toISOString()}
    </div>
  </div>
</body>
</html>`;

  function escapeHtml(str: string): string {
    return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('link');
  const a = document.createElement('a');
  a.href = url;
  a.download = `triarc-bug-#${bug.id}-flow-report.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// -------------------------------------------------------------
// Authentication APIs (W10.1)
//
// These pass skipAuthRedirect: a 401 here means the credentials were
// wrong, not that an existing session expired — the caller renders the
// message inline rather than being bounced to /login.
// -------------------------------------------------------------

export async function loginUser(credentials: { username?: string; password?: string; userId?: string }): Promise<{ user: User; token: string }> {
  const data = await request<{ user: User; token: string }>('/auth/login', {
    method: 'POST',
    body: credentials,
    fallback: 'Login failed',
    skipAuthRedirect: true
  });
  setAuthToken(data.token);
  return data;
}

export async function registerUser(input: {
  username: string;
  name?: string;
  email: string;
  password: string;
}): Promise<{ user: User; token: string }> {
  const data = await request<{ user: User; token: string }>('/auth/register', {
    method: 'POST',
    body: input,
    fallback: 'Registration failed',
    skipAuthRedirect: true
  });
  setAuthToken(data.token);
  return data;
}

export async function quickLoginUser(userId: string): Promise<{ user: User; token: string }> {
  const data = await request<{ user: User; token: string }>('/auth/quick-login', {
    method: 'POST',
    body: { userId },
    fallback: 'Quick login failed',
    skipAuthRedirect: true
  });
  setAuthToken(data.token);
  return data;
}


export async function fetchCurrentProfile(): Promise<{ user: User; token: string }> {
  return request('/auth/me', {
    fallback: 'Authentication required',
    skipAuthRedirect: true
  });
}

// -------------------------------------------------------------
// Administration APIs (W10.4)
// -------------------------------------------------------------

export async function fetchAdminUsers(): Promise<{ users: User[]; groups: any[] }> {
  return request('/admin/users', { fallback: 'Failed to fetch admin users' });
}

export async function updateAdminUser(userId: string, input: { role?: string; security_group_ids?: string[]; is_external?: boolean }): Promise<any> {
  return request(`/admin/users/${userId}`, {
    method: 'PATCH',
    body: input,
    fallback: 'Failed to update user'
  });
}

export async function createAdminUser(input: { username: string; name: string; email: string; role: string; password?: string; security_group_ids?: string[] }): Promise<any> {
  return request('/admin/users', {
    method: 'POST',
    body: input,
    fallback: 'Failed to create user'
  });
}

export async function fetchAdminComponents(): Promise<{ components: any[] }> {
  return request('/admin/components', { fallback: 'Failed to fetch components' });
}

export async function createAdminComponent(input: { id: string; name: string; description?: string }): Promise<any> {
  return request('/admin/components', {
    method: 'POST',
    body: input,
    fallback: 'Failed to create component'
  });
}

export async function deleteAdminComponent(compId: string): Promise<any> {
  return request(`/admin/components/${compId}`, {
    method: 'DELETE',
    fallback: 'Failed to delete component'
  });
}

export async function fetchAdminMilestones(): Promise<{ milestones: any[] }> {
  return request('/admin/milestones', { fallback: 'Failed to fetch milestones' });
}

export async function createAdminMilestone(input: { name: string; due_date?: string }): Promise<any> {
  return request('/admin/milestones', {
    method: 'POST',
    body: input,
    fallback: 'Failed to create milestone'
  });
}

export async function deleteAdminMilestone(msId: string): Promise<any> {
  return request(`/admin/milestones/${msId}`, {
    method: 'DELETE',
    fallback: 'Failed to delete milestone'
  });
}

export async function fetchAdminVersions(): Promise<{ versions: any[] }> {
  return request('/admin/versions', { fallback: 'Failed to fetch versions' });
}

export async function createAdminVersion(input: { name: string }): Promise<any> {
  return request('/admin/versions', {
    method: 'POST',
    body: input,
    fallback: 'Failed to create version'
  });
}

export async function deleteAdminVersion(verId: string): Promise<any> {
  return request(`/admin/versions/${verId}`, {
    method: 'DELETE',
    fallback: 'Failed to delete version'
  });
}

export async function fetchAdminFlagTypes(): Promise<{ flag_types: any[] }> {
  return request('/admin/flag-types', { fallback: 'Failed to fetch flag types' });
}

export async function saveAdminFlagType(input: any): Promise<any> {
  return request('/admin/flag-types', {
    method: 'POST',
    body: input,
    fallback: 'Failed to save flag type'
  });
}

export async function fetchAdminWorkflow(): Promise<{ workflow: any }> {
  return request('/admin/workflow', { fallback: 'Failed to fetch workflow' });
}

// -------------------------------------------------------------
// GitHub Importer APIs (W9)
// -------------------------------------------------------------

export async function importGitHubRepo(input: { repoUrl: string; maxIssues?: number; githubToken?: string; useFixture?: boolean; fixtureName?: string }): Promise<any> {
  return request('/import/github', {
    method: 'POST',
    body: input,
    fallback: 'GitHub import failed'
  });
}

export async function importFixtureRepo(fixtureName: string): Promise<any> {
  return request('/import/fixture', {
    method: 'POST',
    body: { fixtureName },
    fallback: 'Fixture import failed'
  });
}

export async function fetchImportHistory(): Promise<{ imported_repos: any[] }> {
  return request('/import/history', { fallback: 'Failed to fetch import history' });
}

export async function fetchImportFixtures(): Promise<{ fixtures: any[] }> {
  return request('/import/fixtures', { fallback: 'Failed to fetch fixtures' });
}

export async function createProjectFromGitHub(input: {
  repoUrl: string;
  key?: string;
  name?: string;
  description?: string;
  githubToken?: string;
  useFixture?: boolean;
  fixtureName?: string;
}, userId?: string): Promise<{ success: boolean; project: Project; import?: any }> {
  return request('/projects/from-github', {
    method: 'POST',
    body: input,
    userId,
    fallback: 'Failed to create project from GitHub repository'
  });
}

export async function fetchProjectGitTelemetry(projectKey: string, userId?: string): Promise<any> {
  return request(`/projects/${projectKey}/git-telemetry`, {
    userId,
    fallback: `Failed to fetch git telemetry for project ${projectKey}`
  });
}

// -------------------------------------------------------------
// GitHub account linking
// -------------------------------------------------------------

export interface GitHubConnection {
  oauth_available?: boolean;
  connected: boolean;
  login?: string;
  name?: string | null;
  avatar_url?: string | null;
  scopes?: string[];
  auth_method?: 'oauth' | 'pat';
  connected_at?: string;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  private: boolean;
  fork: boolean;
  language: string | null;
  stars: number;
  default_branch: string;
  pushed_at: string;
  open_issues: number;
}

export async function fetchGitHubStatus(userId?: string): Promise<GitHubConnection> {
  return request('/github/status', { userId, fallback: 'Failed to check GitHub connection' });
}

export async function startGitHubOAuth(userId?: string): Promise<{ authorize_url: string }> {
  return request('/github/authorize', { userId, fallback: 'Failed to start GitHub authorization' });
}

export async function connectGitHubToken(token: string, userId?: string): Promise<GitHubConnection> {
  return request('/github/connect-token', {
    method: 'POST',
    body: { token },
    userId,
    fallback: 'Failed to connect GitHub account',
    // A 401 here means GitHub rejected the personal access token — not that the
    // Triarc session expired. Without this, pasting a bad PAT would log the
    // user out of Triarc entirely.
    skipAuthRedirect: true
  });
}

export async function disconnectGitHub(userId?: string): Promise<{ connected: boolean }> {
  return request('/github/disconnect', {
    method: 'DELETE',
    userId,
    fallback: 'Failed to disconnect GitHub account'
  });
}

export async function fetchGitHubRepos(userId?: string): Promise<{ repos: GitHubRepo[]; count: number }> {
  return request('/github/repos', { userId, fallback: 'Failed to load your repositories' });
}

export async function fetchProjectGitGraph(projectKey: string, userId?: string): Promise<GitGraph> {
  return request<GitGraph>(`/projects/${projectKey}/git-graph`, {
    userId,
    fallback: `Failed to build commit graph for project ${projectKey}`
  });
}

export async function simulateProjectCommit(
  projectKey: string,
  input: { author: string; message: string; branch?: string; bugId?: number },
  userId?: string
): Promise<any> {
  return request(`/projects/${projectKey}/simulate-commit`, {
    method: 'POST',
    body: input,
    userId,
    fallback: 'Failed to simulate commit'
  });
}


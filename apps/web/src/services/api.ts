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
  ResolveFlagInput
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

export async function fetchUsers(): Promise<User[]> {
  const res = await fetch(`${API_BASE}/users`);
  if (!res.ok) throw new Error('Failed to fetch users');
  const data = await res.json();
  return data.users;
}

// Projects API
export async function fetchProjects(userId?: string): Promise<Project[]> {
  const res = await fetch(`${API_BASE}/projects`, {
    headers: getHeaders(undefined, userId)
  });
  if (!res.ok) throw new Error('Failed to fetch projects');
  const data = await res.json();
  return data.projects || [];
}

export async function fetchAttentionCounts(userId?: string): Promise<ProjectAttentionSummary> {
  const res = await fetch(`${API_BASE}/projects/attention`, {
    headers: getHeaders(undefined, userId)
  });
  if (!res.ok) throw new Error('Failed to fetch attention counts');
  return res.json();
}

export async function fetchProjectByKey(key: string, userId?: string): Promise<{
  project: Project;
  components: Component[];
  members: ProjectMember[];
}> {
  const res = await fetch(`${API_BASE}/projects/${key}`, {
    headers: getHeaders(undefined, userId)
  });
  if (!res.ok) throw new Error(`Failed to fetch project ${key}`);
  return res.json();
}

export async function createProject(input: CreateProjectInput, userId?: string): Promise<Project> {
  const res = await fetch(`${API_BASE}/projects`, {
    method: 'POST',
    headers: getHeaders(undefined, userId),
    body: JSON.stringify(input)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to create project');
  }
  const data = await res.json();
  return data.project;
}

export async function updateProject(
  key: string,
  data: { name?: string; description?: string; repo_url?: string },
  userId?: string
): Promise<Project> {
  const res = await fetch(`${API_BASE}/projects/${key}`, {
    method: 'PATCH',
    headers: getHeaders(undefined, userId),
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update project');
  }
  const result = await res.json();
  return result.project;
}

export async function addProjectComponent(
  key: string,
  data: { id: string; name: string; description?: string },
  userId?: string
): Promise<any> {
  const res = await fetch(`${API_BASE}/projects/${key}/components`, {
    method: 'POST',
    headers: getHeaders(undefined, userId),
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to add component');
  }
  return res.json();
}

export async function updateProjectMember(
  key: string,
  data: { user_id: string; member_role: string },
  userId?: string
): Promise<any> {
  const res = await fetch(`${API_BASE}/projects/${key}/members`, {
    method: 'POST',
    headers: getHeaders(undefined, userId),
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update project member');
  }
  return res.json();
}

export async function removeProjectMember(
  key: string,
  userIdToRemove: string,
  userId?: string
): Promise<any> {
  const res = await fetch(`${API_BASE}/projects/${key}/members/${userIdToRemove}`, {
    method: 'DELETE',
    headers: getHeaders(undefined, userId)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to remove project member');
  }
  return res.json();
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
  const url = new URL(`${window.location.origin}${API_BASE}/bugs`);
  if (params?.project) url.searchParams.set('project', params.project);
  if (params?.project_id) url.searchParams.set('project_id', params.project_id);
  if (params?.query) url.searchParams.set('query', params.query);
  if (params?.status) url.searchParams.set('status', params.status);
  if (params?.priority) url.searchParams.set('priority', params.priority);
  if (params?.severity) url.searchParams.set('severity', params.severity);
  if (params?.component) url.searchParams.set('component', params.component);
  if (params?.assignee) url.searchParams.set('assignee', params.assignee);

  const res = await fetch(url.toString(), {
    headers: getHeaders(undefined, params?.userId)
  });
  if (!res.ok) throw new Error('Failed to fetch bugs');
  return res.json();
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
  const res = await fetch(`${API_BASE}/bugs/${bugId}`, {
    headers: getHeaders(undefined, userId)
  });
  if (!res.ok) throw new Error(`Failed to fetch bug #${bugId}`);
  return res.json();
}

export async function createBug(input: CreateBugInput, userId?: string): Promise<{ id: number; duplicates: DuplicateMatch[] }> {
  const res = await fetch(`${API_BASE}/bugs`, {
    method: 'POST',
    headers: getHeaders(undefined, userId),
    body: JSON.stringify(input)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to create bug');
  }
  return res.json();
}

export async function checkDuplicates(title: string, description?: string, excludeBugId?: number, userId?: string): Promise<DuplicateMatch[]> {
  const res = await fetch(`${API_BASE}/duplicates/check`, {
    method: 'POST',
    headers: getHeaders(undefined, userId),
    body: JSON.stringify({ title, description, excludeBugId })
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.duplicates || [];
}

export async function transitionBug(bugId: number, input: TransitionBugInput, userId?: string): Promise<any> {
  const res = await fetch(`${API_BASE}/bugs/${bugId}/transition`, {
    method: 'PATCH',
    headers: getHeaders(undefined, userId),
    body: JSON.stringify(input)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to transition bug status');
  }
  return res.json();
}

export async function relateBug(bugId: number, toBugId: number, type: string, userId?: string): Promise<any> {
  const res = await fetch(`${API_BASE}/bugs/${bugId}/relate`, {
    method: 'POST',
    headers: getHeaders(undefined, userId),
    body: JSON.stringify({ toBugId, type })
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to link relationship');
  }
  return res.json();
}

export async function fetchKeywords(): Promise<{ keywords: any[] }> {
  const res = await fetch(`${API_BASE}/keywords`);
  if (!res.ok) throw new Error('Failed to fetch keywords');
  return res.json();
}

export async function fetchMilestones(): Promise<{ milestones: any[] }> {
  const res = await fetch(`${API_BASE}/milestones`);
  if (!res.ok) throw new Error('Failed to fetch milestones');
  return res.json();
}

export async function fetchVersions(): Promise<{ versions: any[] }> {
  const res = await fetch(`${API_BASE}/versions`);
  if (!res.ok) throw new Error('Failed to fetch versions');
  return res.json();
}

export async function watchBug(bugId: number, userId?: string): Promise<any> {
  const res = await fetch(`${API_BASE}/bugs/${bugId}/watch`, {
    method: 'POST',
    headers: getHeaders(undefined, userId)
  });
  if (!res.ok) throw new Error('Failed to watch bug');
  return res.json();
}

export async function unwatchBug(bugId: number, userId?: string): Promise<any> {
  const res = await fetch(`${API_BASE}/bugs/${bugId}/watch`, {
    method: 'DELETE',
    headers: getHeaders(undefined, userId)
  });
  if (!res.ok) throw new Error('Failed to unwatch bug');
  return res.json();
}

export async function addBugKeyword(bugId: number, keyword_id: string, userId?: string): Promise<any> {
  const res = await fetch(`${API_BASE}/bugs/${bugId}/keywords`, {
    method: 'POST',
    headers: getHeaders(undefined, userId),
    body: JSON.stringify({ keyword_id })
  });
  if (!res.ok) throw new Error('Failed to add keyword');
  return res.json();
}

export async function removeBugKeyword(bugId: number, keywordId: string, userId?: string): Promise<any> {
  const res = await fetch(`${API_BASE}/bugs/${bugId}/keywords/${keywordId}`, {
    method: 'DELETE',
    headers: getHeaders(undefined, userId)
  });
  if (!res.ok) throw new Error('Failed to remove keyword');
  return res.json();
}

export async function fetchSavedSearches(userId?: string): Promise<{ saved_searches: any[] }> {
  const res = await fetch(`${API_BASE}/saved-searches`, {
    headers: getHeaders(undefined, userId)
  });
  if (!res.ok) throw new Error('Failed to fetch saved searches');
  return res.json();
}

export async function createSavedSearch(name: string, query: string, userId?: string): Promise<any> {
  const res = await fetch(`${API_BASE}/saved-searches`, {
    method: 'POST',
    headers: getHeaders(undefined, userId),
    body: JSON.stringify({ name, query })
  });
  if (!res.ok) throw new Error('Failed to create saved search');
  return res.json();
}

export async function deleteSavedSearch(id: string, userId?: string): Promise<any> {
  const res = await fetch(`${API_BASE}/saved-searches/${id}`, {
    method: 'DELETE',
    headers: getHeaders(undefined, userId)
  });
  if (!res.ok) throw new Error('Failed to delete saved search');
  return res.json();
}

export async function fetchNotifications(unreadOnly: boolean = false, userId?: string): Promise<{ notifications: any[]; unread_count: number }> {
  const res = await fetch(`${API_BASE}/notifications${unreadOnly ? '?unread=true' : ''}`, {
    headers: getHeaders(undefined, userId)
  });
  if (!res.ok) throw new Error('Failed to fetch notifications');
  return res.json();
}

export async function markNotificationRead(id: number, userId?: string): Promise<any> {
  const res = await fetch(`${API_BASE}/notifications/${id}/read`, {
    method: 'PATCH',
    headers: getHeaders(undefined, userId)
  });
  if (!res.ok) throw new Error('Failed to mark notification read');
  return res.json();
}

export async function markAllNotificationsRead(userId?: string): Promise<any> {
  const res = await fetch(`${API_BASE}/notifications/read-all`, {
    method: 'POST',
    headers: getHeaders(undefined, userId)
  });
  if (!res.ok) throw new Error('Failed to mark all notifications read');
  return res.json();
}

export async function addComment(bugId: number, body: string, is_private: boolean = false, work_time: number = 0, userId?: string): Promise<any> {
  const res = await fetch(`${API_BASE}/bugs/${bugId}/comments`, {
    method: 'POST',
    headers: getHeaders(undefined, userId),
    body: JSON.stringify({ body, is_private, work_time })
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to post comment');
  }
  return res.json();
}

export async function fetchInbox(userId?: string): Promise<{
  incoming: Flag[];
  outgoing: Flag[];
  resolved: Flag[];
  counts: { incoming: number; outgoing: number };
}> {
  const res = await fetch(`${API_BASE}/inbox`, {
    headers: getHeaders(undefined, userId)
  });
  if (!res.ok) throw new Error('Failed to fetch Request Inbox');
  return res.json();
}

export async function createFlag(bugId: number, input: CreateFlagInput, userId?: string): Promise<any> {
  const res = await fetch(`${API_BASE}/bugs/${bugId}/flags`, {
    method: 'POST',
    headers: getHeaders(undefined, userId),
    body: JSON.stringify(input)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to request flag');
  }
  return res.json();
}

export async function resolveFlag(flagId: number, input: ResolveFlagInput, userId?: string): Promise<any> {
  const res = await fetch(`${API_BASE}/flags/${flagId}`, {
    method: 'PATCH',
    headers: getHeaders(undefined, userId),
    body: JSON.stringify(input)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to resolve flag');
  }
  return res.json();
}

export async function fetchFlowAnalytics(days: number = 30, userId?: string, project?: string): Promise<any> {
  const url = new URL(`${window.location.origin}${API_BASE}/analytics/flow`);
  url.searchParams.set('days', String(days));
  if (project) url.searchParams.set('project', project);

  const res = await fetch(url.toString(), {
    headers: getHeaders(undefined, userId)
  });
  if (!res.ok) throw new Error('Failed to fetch flow analytics');
  return res.json();
}

export async function sendPresenceHeartbeat(bugId: number, userId?: string): Promise<any> {
  const res = await fetch(`${API_BASE}/presence/heartbeat`, {
    method: 'POST',
    headers: getHeaders(undefined, userId),
    body: JSON.stringify({ bugId })
  });
  if (!res.ok) return null;
  return res.json();
}

export async function simulateWebhook(payload: {

  type: 'commit' | 'pr_open' | 'pr_review' | 'pr_merge';
  bugId: number;
  message?: string;
  author?: string;
  prNumber?: number;
  branchName?: string;
}): Promise<any> {
  const res = await fetch(`${API_BASE}/webhooks/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to simulate webhook');
  }
  return res.json();
}

export async function fetchDigest(since?: string, userId?: string): Promise<any> {
  const url = since ? `${API_BASE}/digest?since=${encodeURIComponent(since)}` : `${API_BASE}/digest`;
  const res = await fetch(url, {
    headers: getHeaders(undefined, userId)
  });
  if (!res.ok) throw new Error('Failed to fetch notifications digest');
  return res.json();
}

export async function fetchActivityHeatmap(days: number = 90, userId?: string): Promise<any> {
  const res = await fetch(`${API_BASE}/analytics/activity-heatmap?days=${days}`, {
    headers: getHeaders(undefined, userId)
  });
  if (!res.ok) throw new Error('Failed to fetch activity heatmap');
  return res.json();
}

export async function updateBug(bugId: number, input: any, userId?: string): Promise<any> {
  const res = await fetch(`${API_BASE}/bugs/${bugId}`, {
    method: 'PATCH',
    headers: getHeaders(undefined, userId),
    body: JSON.stringify(input)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to update bug');
  }
  return res.json();
}

export async function bulkTransitionBugs(input: any, userId?: string): Promise<any> {
  const res = await fetch(`${API_BASE}/bugs/bulk-transition`, {
    method: 'POST',
    headers: getHeaders(undefined, userId),
    body: JSON.stringify(input)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to execute bulk transition');
  }
  return res.json();
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
// -------------------------------------------------------------

export async function loginUser(credentials: { username?: string; password?: string; userId?: string }): Promise<{ user: User; token: string }> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(credentials)
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Login failed');
  }
  setAuthToken(data.token);
  return data;
}

export async function quickLoginUser(userId: string): Promise<{ user: User; token: string }> {
  const res = await fetch(`${API_BASE}/auth/quick-login`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ userId })
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Quick login failed');
  }
  setAuthToken(data.token);
  return data;
}

export async function fetchCurrentProfile(): Promise<{ user: User; token: string }> {
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: getHeaders()
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Authentication required');
  }
  return data;
}

// -------------------------------------------------------------
// Administration APIs (W10.4)
// -------------------------------------------------------------

export async function fetchAdminUsers(): Promise<{ users: User[]; groups: any[] }> {
  const res = await fetch(`${API_BASE}/admin/users`, { headers: getHeaders() });
  if (!res.ok) throw new Error('Failed to fetch admin users');
  return res.json();
}

export async function updateAdminUser(userId: string, input: { role?: string; security_group_ids?: string[]; is_external?: boolean }): Promise<any> {
  const res = await fetch(`${API_BASE}/admin/users/${userId}`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify(input)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to update user');
  }
  return res.json();
}

export async function createAdminUser(input: { username: string; name: string; email: string; role: string; password?: string; security_group_ids?: string[] }): Promise<any> {
  const res = await fetch(`${API_BASE}/admin/users`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(input)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to create user');
  }
  return res.json();
}

export async function fetchAdminComponents(): Promise<{ components: any[] }> {
  const res = await fetch(`${API_BASE}/admin/components`, { headers: getHeaders() });
  if (!res.ok) throw new Error('Failed to fetch components');
  return res.json();
}

export async function createAdminComponent(input: { id: string; name: string; description?: string }): Promise<any> {
  const res = await fetch(`${API_BASE}/admin/components`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(input)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to create component');
  }
  return res.json();
}

export async function deleteAdminComponent(compId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/admin/components/${compId}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
  if (!res.ok) throw new Error('Failed to delete component');
  return res.json();
}

export async function fetchAdminMilestones(): Promise<{ milestones: any[] }> {
  const res = await fetch(`${API_BASE}/admin/milestones`, { headers: getHeaders() });
  if (!res.ok) throw new Error('Failed to fetch milestones');
  return res.json();
}

export async function createAdminMilestone(input: { name: string; due_date?: string }): Promise<any> {
  const res = await fetch(`${API_BASE}/admin/milestones`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(input)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to create milestone');
  }
  return res.json();
}

export async function deleteAdminMilestone(msId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/admin/milestones/${msId}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
  if (!res.ok) throw new Error('Failed to delete milestone');
  return res.json();
}

export async function fetchAdminVersions(): Promise<{ versions: any[] }> {
  const res = await fetch(`${API_BASE}/admin/versions`, { headers: getHeaders() });
  if (!res.ok) throw new Error('Failed to fetch versions');
  return res.json();
}

export async function createAdminVersion(input: { name: string }): Promise<any> {
  const res = await fetch(`${API_BASE}/admin/versions`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(input)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to create version');
  }
  return res.json();
}

export async function deleteAdminVersion(verId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/admin/versions/${verId}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
  if (!res.ok) throw new Error('Failed to delete version');
  return res.json();
}

export async function fetchAdminFlagTypes(): Promise<{ flag_types: any[] }> {
  const res = await fetch(`${API_BASE}/admin/flag-types`, { headers: getHeaders() });
  if (!res.ok) throw new Error('Failed to fetch flag types');
  return res.json();
}

export async function saveAdminFlagType(input: any): Promise<any> {
  const res = await fetch(`${API_BASE}/admin/flag-types`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(input)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to save flag type');
  }
  return res.json();
}

export async function fetchAdminWorkflow(): Promise<{ workflow: any }> {
  const res = await fetch(`${API_BASE}/admin/workflow`, { headers: getHeaders() });
  if (!res.ok) throw new Error('Failed to fetch workflow');
  return res.json();
}

// -------------------------------------------------------------
// GitHub Importer APIs (W9)
// -------------------------------------------------------------

export async function importGitHubRepo(input: { repoUrl: string; maxIssues?: number; githubToken?: string; useFixture?: boolean; fixtureName?: string }): Promise<any> {
  const res = await fetch(`${API_BASE}/import/github`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(input)
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'GitHub import failed');
  }
  return data;
}

export async function importFixtureRepo(fixtureName: string): Promise<any> {
  const res = await fetch(`${API_BASE}/import/fixture`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ fixtureName })
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Fixture import failed');
  }
  return data;
}

export async function fetchImportHistory(): Promise<{ imported_repos: any[] }> {
  const res = await fetch(`${API_BASE}/import/history`, { headers: getHeaders() });
  if (!res.ok) throw new Error('Failed to fetch import history');
  return res.json();
}

export async function fetchImportFixtures(): Promise<{ fixtures: any[] }> {
  const res = await fetch(`${API_BASE}/import/fixtures`, { headers: getHeaders() });
  if (!res.ok) throw new Error('Failed to fetch fixtures');
  return res.json();
}



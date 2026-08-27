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
  CreateBugInput,
  TransitionBugInput,
  CreateFlagInput,
  ResolveFlagInput
} from '@triarc/shared-types';

const API_BASE = '/api';

function getHeaders(token?: string, userId?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
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

export async function fetchBugs(params?: {
  query?: string;
  status?: string;
  priority?: string;
  severity?: string;
  component?: string;
  assignee?: string;
  userId?: string;
}): Promise<{ bugs: Bug[]; count: number }> {
  const url = new URL(`${window.location.origin}${API_BASE}/bugs`);
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

export async function fetchBugDetail(bugId: number, userId?: string): Promise<{
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

export async function addComment(bugId: number, body: string, is_private: boolean = false, userId?: string): Promise<any> {
  const res = await fetch(`${API_BASE}/bugs/${bugId}/comments`, {
    method: 'POST',
    headers: getHeaders(undefined, userId),
    body: JSON.stringify({ body, is_private })
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

export async function fetchFlowAnalytics(days: number = 30, userId?: string): Promise<any> {
  const res = await fetch(`${API_BASE}/analytics/flow?days=${days}`, {
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

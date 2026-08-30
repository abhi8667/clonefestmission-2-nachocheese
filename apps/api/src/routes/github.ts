import { Router, Response } from 'express';
import crypto from 'crypto';
import { db } from '../db/database.js';
import { AuthenticatedRequest, authMiddleware } from '../middleware/auth.js';

export const githubRouter = Router();

const CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const APP_URL = process.env.APP_URL || 'http://localhost:5173';
const OAUTH_SCOPES = 'read:user repo';

/** OAuth is optional: without an app registered, the PAT path still works. */
export function isOAuthConfigured(): boolean {
  return !!CLIENT_ID && !!CLIENT_SECRET;
}

interface ConnectionRow {
  user_id: string;
  access_token: string;
  github_login: string;
  github_name: string | null;
  github_avatar: string | null;
  scopes: string | null;
  auth_method: string;
  connected_at: string;
}

/** Server-side only — the token must never reach the browser. */
export function getGitHubToken(userId: string | undefined): string | undefined {
  if (!userId) return undefined;
  const row = db
    .prepare('SELECT access_token FROM github_connections WHERE user_id = ?')
    .get(userId) as { access_token: string } | undefined;
  return row?.access_token;
}

/** Shape sent to the client: identity only, never the credential. */
function publicConnection(row: ConnectionRow) {
  return {
    connected: true,
    login: row.github_login,
    name: row.github_name,
    avatar_url: row.github_avatar,
    scopes: row.scopes ? row.scopes.split(',').filter(Boolean) : [],
    auth_method: row.auth_method,
    connected_at: row.connected_at
  };
}

async function fetchGitHubUser(token: string) {
  const res = await fetch('https://api.github.com/user', {
    headers: {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'Triarc-Bug-Tracker/1.0',
      Authorization: `token ${token}`
    }
  });
  if (!res.ok) return null;
  return (await res.json()) as any;
}

function saveConnection(
  userId: string,
  token: string,
  profile: any,
  scopes: string,
  method: 'oauth' | 'pat'
) {
  db.prepare(
    `INSERT INTO github_connections
       (user_id, access_token, github_login, github_name, github_avatar, scopes, auth_method, connected_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(user_id) DO UPDATE SET
       access_token = excluded.access_token,
       github_login = excluded.github_login,
       github_name  = excluded.github_name,
       github_avatar= excluded.github_avatar,
       scopes       = excluded.scopes,
       auth_method  = excluded.auth_method,
       connected_at = excluded.connected_at`
  ).run(
    userId,
    token,
    profile.login,
    profile.name || profile.login,
    profile.avatar_url || null,
    scopes,
    method
  );
}

// GET /api/github/status - is OAuth available, and is this user connected?
githubRouter.get('/status', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const row = db
    .prepare('SELECT * FROM github_connections WHERE user_id = ?')
    .get(req.user!.id) as ConnectionRow | undefined;

  res.json({
    oauth_available: isOAuthConfigured(),
    ...(row ? publicConnection(row) : { connected: false })
  });
});

// -------------------------------------------------------------
// OAuth flow
// -------------------------------------------------------------

/**
 * Short-lived CSRF states. In-memory is correct here: the value is only
 * meaningful for the ~60s between redirecting out and coming back.
 */
const pendingStates = new Map<string, { userId: string; expires: number }>();

function sweepStates() {
  const now = Date.now();
  for (const [k, v] of pendingStates) if (v.expires < now) pendingStates.delete(k);
}

// GET /api/github/authorize - send the user to GitHub's consent screen
githubRouter.get('/authorize', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  if (!isOAuthConfigured()) {
    return res.status(501).json({
      error: 'GitHub OAuth is not configured on this server. Connect with a personal access token instead.',
      code: 'OAUTH_NOT_CONFIGURED'
    });
  }

  sweepStates();
  const state = crypto.randomBytes(16).toString('hex');
  pendingStates.set(state, { userId: req.user!.id, expires: Date.now() + 10 * 60 * 1000 });

  const url = new URL('https://github.com/login/oauth/authorize');
  url.searchParams.set('client_id', CLIENT_ID!);
  url.searchParams.set('scope', OAUTH_SCOPES);
  url.searchParams.set('state', state);
  url.searchParams.set(
    'redirect_uri',
    `${process.env.API_URL || 'http://localhost:3001'}/api/github/callback`
  );

  res.json({ authorize_url: url.toString() });
});

// GET /api/github/callback - GitHub redirects here with a code
// Not behind authMiddleware: the browser arrives from github.com, and the
// `state` we minted is what ties the callback back to a user.
githubRouter.get('/callback', async (req, res) => {
  const code = String(req.query.code || '');
  const state = String(req.query.state || '');

  const fail = (reason: string) =>
    res.redirect(`${APP_URL}/github?github_error=${encodeURIComponent(reason)}`);

  if (!code || !state) return fail('Missing authorization code');

  sweepStates();
  const pending = pendingStates.get(state);
  if (!pending) return fail('Authorization request expired or invalid. Please try again.');
  pendingStates.delete(state);

  if (!isOAuthConfigured()) return fail('GitHub OAuth is not configured');

  try {
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
        redirect_uri: `${process.env.API_URL || 'http://localhost:3001'}/api/github/callback`
      })
    });

    const payload: any = await tokenRes.json();
    if (!tokenRes.ok || !payload?.access_token) {
      return fail(payload?.error_description || 'GitHub rejected the authorization');
    }

    const profile = await fetchGitHubUser(payload.access_token);
    if (!profile?.login) return fail('Could not read your GitHub profile');

    saveConnection(pending.userId, payload.access_token, profile, payload.scope || OAUTH_SCOPES, 'oauth');
    res.redirect(`${APP_URL}/github?github_connected=1`);
  } catch {
    fail('Could not reach GitHub. Please try again.');
  }
});

// -------------------------------------------------------------
// Personal access token — always available, no app registration needed
// -------------------------------------------------------------

// POST /api/github/connect-token { token }
githubRouter.post('/connect-token', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const token = String(req.body?.token || '').trim();
  if (!token) {
    return res.status(400).json({ error: 'A personal access token is required', code: 'MISSING_TOKEN' });
  }

  const profile = await fetchGitHubUser(token);
  if (!profile?.login) {
    return res.status(401).json({
      error: 'GitHub rejected that token. Check that it is valid and has the "repo" scope.',
      code: 'INVALID_GITHUB_TOKEN'
    });
  }

  saveConnection(req.user!.id, token, profile, 'pat', 'pat');

  const row = db
    .prepare('SELECT * FROM github_connections WHERE user_id = ?')
    .get(req.user!.id) as ConnectionRow;
  res.json(publicConnection(row));
});

// DELETE /api/github/disconnect
githubRouter.delete('/disconnect', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  db.prepare('DELETE FROM github_connections WHERE user_id = ?').run(req.user!.id);
  res.json({ connected: false });
});

// GET /api/github/repos - the signed-in user's repositories
githubRouter.get('/repos', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const token = getGitHubToken(req.user!.id);
  if (!token) {
    return res.status(403).json({
      error: 'Connect your GitHub account first.',
      code: 'GITHUB_NOT_CONNECTED'
    });
  }

  const sort = String(req.query.sort || 'pushed');
  const perPage = Math.min(Number(req.query.per_page) || 50, 100);

  try {
    const ghRes = await fetch(
      `https://api.github.com/user/repos?per_page=${perPage}&sort=${encodeURIComponent(sort)}&affiliation=owner,collaborator,organization_member`,
      {
        headers: {
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'Triarc-Bug-Tracker/1.0',
          Authorization: `token ${token}`
        }
      }
    );

    if (ghRes.status === 401) {
      // The token was revoked on GitHub's side — drop the dead connection.
      db.prepare('DELETE FROM github_connections WHERE user_id = ?').run(req.user!.id);
      return res.status(403).json({
        error: 'Your GitHub authorization is no longer valid. Please reconnect.',
        code: 'GITHUB_TOKEN_REVOKED'
      });
    }

    if (!ghRes.ok) {
      return res.status(502).json({ error: 'GitHub API request failed', code: 'GITHUB_UPSTREAM_ERROR' });
    }

    const raw: any = await ghRes.json();
    const repos = (Array.isArray(raw) ? raw : []).map((r: any) => ({
      id: r.id,
      name: r.name,
      full_name: r.full_name,
      description: r.description,
      html_url: r.html_url,
      private: !!r.private,
      fork: !!r.fork,
      language: r.language,
      stars: r.stargazers_count ?? 0,
      default_branch: r.default_branch,
      pushed_at: r.pushed_at,
      open_issues: r.open_issues_count ?? 0
    }));

    res.json({ repos, count: repos.length });
  } catch {
    res.status(502).json({ error: 'Could not reach GitHub', code: 'GITHUB_UNREACHABLE' });
  }
});

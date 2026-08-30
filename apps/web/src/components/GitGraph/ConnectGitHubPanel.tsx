import React, { useState } from 'react';
import { GitHubConnection, startGitHubOAuth, connectGitHubToken, disconnectGitHub } from '../../services/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { Github, Loader2, AlertCircle, KeyRound, LogOut, CheckCircle2, ExternalLink } from 'lucide-react';

interface Props {
  connection: GitHubConnection;
  onChange: (c: GitHubConnection) => void;
}

export const ConnectGitHubPanel: React.FC<Props> = ({ connection, onChange }) => {
  const { currentUser } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showToken, setShowToken] = useState(false);
  const [token, setToken] = useState('');

  const authorize = async () => {
    setBusy(true);
    setError(null);
    try {
      const { authorize_url } = await startGitHubOAuth(currentUser?.id);
      // Full navigation: GitHub's consent screen refuses to render in a frame.
      window.location.href = authorize_url;
    } catch (e: any) {
      setError(e.message || 'Could not start GitHub authorization');
      setShowToken(true);
      setBusy(false);
    }
  };

  const submitToken = async () => {
    if (!token.trim()) return;
    setBusy(true);
    setError(null);
    try {
      onChange(await connectGitHubToken(token.trim(), currentUser?.id));
      setToken('');
      setShowToken(false);
    } catch (e: any) {
      setError(e.message || 'Could not connect that token');
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    setBusy(true);
    setError(null);
    try {
      await disconnectGitHub(currentUser?.id);
      onChange({ connected: false, oauth_available: connection.oauth_available });
    } catch (e: any) {
      setError(e.message || 'Could not disconnect');
    } finally {
      setBusy(false);
    }
  };

  // ---- Connected state ----
  if (connection.connected) {
    return (
      <section className="bg-[#0e0e0e] border border-border p-4 mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          {connection.avatar_url && (
            <img
              src={connection.avatar_url}
              alt=""
              className="w-9 h-9 rounded-full border border-border"
            />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="text-xs font-bold text-foreground truncate">
                @{connection.login}
              </span>
              <span className="text-[9px] uppercase tracking-widest px-1.5 py-0.5 bg-[#1a1a1a] border border-border text-muted-foreground">
                {connection.auth_method === 'oauth' ? 'OAuth' : 'Token'}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              GitHub account connected · private repositories visible
            </p>
          </div>
          <button
            onClick={disconnect}
            disabled={busy}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#121212] border border-border hover:border-rose-500 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-rose-300 transition-colors disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-rose-500 outline-none"
          >
            {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <LogOut className="w-3 h-3" />}
            Disconnect
          </button>
        </div>
        {error && (
          <p role="alert" className="mt-2 text-[11px] text-rose-300 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" /> {error}
          </p>
        )}
      </section>
    );
  }

  // ---- Disconnected state ----
  return (
    <section className="bg-[#0e0e0e] border border-border p-5 mb-6">
      <div className="flex items-start gap-3 mb-4">
        <span className="w-10 h-10 grid place-items-center bg-[#1a1a1a] border border-border shrink-0">
          <Github className="w-5 h-5 text-emerald-400" />
        </span>
        <div>
          <h2 className="text-sm font-black uppercase tracking-wide text-foreground mb-1">
            Connect your GitHub account
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-xl">
            Browse your own repositories — public and private — and plot any of them as a
            branch graph. Triarc only reads repository metadata; it never writes to your code.
          </p>
        </div>
      </div>

      {error && (
        <p role="alert" className="mb-3 text-[11px] text-rose-300 flex items-start gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {error}
        </p>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        {connection.oauth_available && (
          <button
            onClick={authorize}
            disabled={busy}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-[11px] font-bold uppercase tracking-widest transition-colors focus-visible:ring-2 focus-visible:ring-emerald-400 outline-none"
          >
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Github className="w-3.5 h-3.5" />}
            Authorize with GitHub
          </button>
        )}

        <button
          onClick={() => setShowToken((v) => !v)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#121212] border border-border hover:border-emerald-500 text-foreground text-[11px] font-bold uppercase tracking-widest transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 outline-none"
        >
          <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
          {connection.oauth_available ? 'Use a token instead' : 'Connect with a token'}
        </button>
      </div>

      {!connection.oauth_available && !showToken && (
        <p className="mt-3 text-[10px] text-muted-foreground">
          One-click OAuth isn't configured on this server. A personal access token works the same way.
        </p>
      )}

      {showToken && (
        <div className="mt-4 pt-4 border-t border-border">
          <label htmlFor="gh-pat" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-2">
            Personal access token
          </label>
          <div className="flex gap-2 flex-wrap">
            <input
              id="gh-pat"
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submitToken(); }}
              placeholder="ghp_…"
              autoComplete="off"
              className="flex-1 min-w-[16rem] bg-[#080808] border border-border focus:border-emerald-500 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            />
            <button
              onClick={submitToken}
              disabled={busy || !token.trim()}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-[10px] font-bold uppercase tracking-widest transition-colors focus-visible:ring-2 focus-visible:ring-emerald-400 outline-none"
            >
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Connect'}
            </button>
          </div>
          <p className="mt-2 text-[10px] text-muted-foreground">
            Needs the <code className="text-foreground">repo</code> scope for private repositories.{' '}
            <a
              href="https://github.com/settings/tokens/new?scopes=repo,read:user&description=Triarc"
              target="_blank"
              rel="noreferrer noopener"
              className="text-emerald-400 hover:underline inline-flex items-center gap-0.5 focus-visible:ring-2 focus-visible:ring-emerald-500 outline-none"
            >
              Create one <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </p>
        </div>
      )}
    </section>
  );
};

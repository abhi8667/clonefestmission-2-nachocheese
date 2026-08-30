import React, { useEffect, useMemo, useState } from 'react';
import { GitHubRepo, fetchGitHubRepos } from '../../services/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { Loader2, AlertCircle, Lock, Star, Search, GitFork, CircleDot } from 'lucide-react';

interface Props {
  onPick: (repo: GitHubRepo) => void;
  pickingUrl?: string | null;
}

function relative(iso: string): string {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (d < 1) return 'today';
  if (d === 1) return 'yesterday';
  if (d < 30) return `${d}d ago`;
  if (d < 365) return `${Math.floor(d / 30)}mo ago`;
  return `${Math.floor(d / 365)}y ago`;
}

export const RepoPicker: React.FC<Props> = ({ onPick, pickingUrl }) => {
  const { currentUser } = useAuth();
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchGitHubRepos(currentUser?.id)
      .then((r) => alive && setRepos(r.repos))
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [currentUser?.id]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return repos;
    return repos.filter(
      (r) =>
        r.full_name.toLowerCase().includes(needle) ||
        (r.description || '').toLowerCase().includes(needle) ||
        (r.language || '').toLowerCase().includes(needle)
    );
  }, [repos, q]);

  if (loading) {
    return (
      <div className="border border-border bg-[#0e0e0e] py-12 grid place-items-center gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Loading your repositories…
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" className="flex items-start gap-2 bg-[#2a1512] border border-rose-700 text-rose-300 px-4 py-3 text-xs">
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
        <span>{error}</span>
      </div>
    );
  }

  return (
    <section className="border border-border bg-[#0e0e0e]">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filter your repositories…"
          aria-label="Filter repositories"
          className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-sm px-1"
        />
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground tabular-nums shrink-0">
          {filtered.length} / {repos.length}
        </span>
      </div>

      <ul className="max-h-[26rem] overflow-y-auto divide-y divide-border">
        {filtered.map((r) => {
          const busy = pickingUrl === r.html_url;
          return (
            <li key={r.id}>
              <button
                onClick={() => onPick(r)}
                disabled={!!pickingUrl}
                className="w-full text-left px-4 py-3 hover:bg-[#151515] disabled:opacity-50 transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-inset outline-none"
              >
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <span className="text-xs font-bold text-foreground">{r.full_name}</span>
                  {r.private && (
                    <span className="flex items-center gap-1 text-[9px] uppercase tracking-widest px-1.5 py-0.5 bg-[#1a1a1a] border border-border text-amber-400">
                      <Lock className="w-2.5 h-2.5" /> Private
                    </span>
                  )}
                  {r.fork && <GitFork className="w-3 h-3 text-muted-foreground" />}
                  {busy && <Loader2 className="w-3 h-3 animate-spin text-emerald-400" />}
                </div>

                {r.description && (
                  <p className="text-[11px] text-muted-foreground leading-snug mb-1.5 line-clamp-2">
                    {r.description}
                  </p>
                )}

                <div className="flex items-center gap-3 text-[9px] uppercase tracking-widest text-muted-foreground flex-wrap">
                  {r.language && <span className="text-emerald-400">{r.language}</span>}
                  <span className="flex items-center gap-1 tabular-nums">
                    <Star className="w-2.5 h-2.5" /> {r.stars}
                  </span>
                  <span className="flex items-center gap-1 tabular-nums">
                    <CircleDot className="w-2.5 h-2.5" /> {r.open_issues}
                  </span>
                  <span>{r.default_branch}</span>
                  <span>pushed {relative(r.pushed_at)}</span>
                </div>
              </button>
            </li>
          );
        })}

        {filtered.length === 0 && (
          <li className="px-4 py-10 text-center">
            <p className="text-xs text-muted-foreground">
              {repos.length === 0
                ? 'No repositories found on this account.'
                : `No repositories match “${q}”.`}
            </p>
          </li>
        )}
      </ul>
    </section>
  );
};

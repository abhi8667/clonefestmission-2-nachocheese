import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { GitGraph, GitGraphNode, Project } from '@triarc/shared-types';
import { useAuth } from '../context/AuthContext.tsx';
import {
  fetchProjects,
  fetchProjectGitGraph,
  createProjectFromGitHub,
  fetchGitHubStatus,
  GitHubConnection,
  GitHubRepo
} from '../services/api.ts';
import { CommitGraph } from '../components/GitGraph/CommitGraph.tsx';
import { ConnectGitHubPanel } from '../components/GitGraph/ConnectGitHubPanel.tsx';
import { RepoPicker } from '../components/GitGraph/RepoPicker.tsx';
import {
  Github,
  Loader2,
  AlertCircle,
  GitBranch,
  Moon,
  Users,
  GitCommitHorizontal,
  Radio,
  Building2,
  ExternalLink,
  Plus
} from 'lucide-react';

const SAMPLE_REPOS = [
  'https://github.com/facebook/react',
  'https://github.com/fastify/fastify',
  'https://github.com/vitejs/vite'
];

export const GitHubWorkspaceView: React.FC = () => {
  const { currentUser } = useAuth();

  const [projects, setProjects] = useState<Project[]>([]);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [graph, setGraph] = useState<GitGraph | null>(null);

  const [loadingGraph, setLoadingGraph] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [repoUrl, setRepoUrl] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [selected, setSelected] = useState<GitGraphNode | null>(null);

  const [connection, setConnection] = useState<GitHubConnection>({ connected: false });
  const [pickingUrl, setPickingUrl] = useState<string | null>(null);

  // Account link status, plus the result of returning from the OAuth redirect.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthError = params.get('github_error');
    if (oauthError) setError(oauthError);
    if (oauthError || params.get('github_connected')) {
      window.history.replaceState({}, '', '/github');
    }

    let alive = true;
    fetchGitHubStatus(currentUser?.id)
      .then((c) => alive && setConnection(c))
      .catch(() => { /* linking is optional — public repos still work */ });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  // Load the user's projects once; any of them can back a repo view.
  useEffect(() => {
    let alive = true;
    fetchProjects(currentUser?.id)
      .then((list) => {
        if (!alive) return;
        setProjects(list);
        if (list.length && !activeKey) setActiveKey(list[0].key);
      })
      .catch((e) => alive && setError(e.message));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  const loadGraph = useCallback(async (key: string) => {
    setLoadingGraph(true);
    setError(null);
    setSelected(null);
    try {
      setGraph(await fetchProjectGitGraph(key, currentUser?.id));
    } catch (e: any) {
      setError(e.message || 'Failed to load commit graph');
      setGraph(null);
    } finally {
      setLoadingGraph(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    if (activeKey) loadGraph(activeKey);
  }, [activeKey, loadGraph]);

  const connectRepo = async (url: string) => {
    if (!url.trim()) return;
    setConnecting(true);
    setError(null);
    try {
      const res = await createProjectFromGitHub({ repoUrl: url.trim() }, currentUser?.id);
      const list = await fetchProjects(currentUser?.id);
      setProjects(list);
      setActiveKey(res.project.key);
      setRepoUrl('');
    } catch (e: any) {
      setError(e.message || 'Could not connect that repository');
    } finally {
      setConnecting(false);
    }
  };

  const pickRepo = async (repo: GitHubRepo) => {
    setPickingUrl(repo.html_url);
    try {
      await connectRepo(repo.html_url);
    } finally {
      setPickingUrl(null);
    }
  };

  const stat = (Icon: any, label: string, value: React.ReactNode, tone = 'text-foreground') => (
    <div className="bg-[#0e0e0e] border border-border px-3.5 py-3">
      <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-widest text-muted-foreground mb-1.5">
        <Icon className="w-3 h-3" /> {label}
      </div>
      <div className={`text-lg font-black tabular-nums leading-none ${tone}`}>{value}</div>
    </div>
  );

  return (
    <main id="main-content" className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <header className="mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 mb-1.5 flex items-center gap-1.5">
              <Github className="w-3 h-3" /> Personal workspace
            </p>
            <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-foreground">
              Repository graph
            </h1>
          </div>
          <Link
            to="/projects"
            className="flex items-center gap-1.5 px-3 py-2 bg-[#121212] border border-border hover:border-[#B497CF] text-[10px] font-bold uppercase tracking-widest transition-colors focus-visible:ring-2 focus-visible:ring-[#B497CF] outline-none"
          >
            <Building2 className="w-3.5 h-3.5 text-[#B497CF]" />
            Organization workspace
          </Link>
        </div>
        <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
          The trunk runs as one continuous line. Every branch diverges at the commit it was cut
          from and curves back where it merged — so a branch that never landed stays visibly open.
        </p>
      </header>

      {/* Account link */}
      <ConnectGitHubPanel connection={connection} onChange={setConnection} />

      {/* Your repositories, once linked */}
      {connection.connected && (
        <div className="mb-6">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
            Your repositories
          </h2>
          <RepoPicker onPick={pickRepo} pickingUrl={pickingUrl} />
        </div>
      )}

      {/* Connect a repo by URL */}
      <section className="bg-[#0e0e0e] border border-border p-4 mb-6">
        <label htmlFor="repo-url" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-2">
          {connection.connected ? 'Or paste any repository URL' : 'Connect a public repository'}
        </label>
        <div className="flex gap-2 flex-wrap">
          <input
            id="repo-url"
            type="url"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') connectRepo(repoUrl); }}
            placeholder="https://github.com/owner/repo"
            className="flex-1 min-w-[16rem] bg-[#080808] border border-border focus:border-emerald-500 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          />
          <button
            onClick={() => connectRepo(repoUrl)}
            disabled={connecting || !repoUrl.trim()}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[10px] font-bold uppercase tracking-widest transition-colors focus-visible:ring-2 focus-visible:ring-emerald-400 outline-none"
          >
            {connecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            {connecting ? 'Connecting' : 'Connect'}
          </button>
        </div>
        <div className="flex items-center gap-2 mt-2.5 flex-wrap">
          <span className="text-[9px] uppercase tracking-widest text-muted-foreground">Try:</span>
          {SAMPLE_REPOS.map((r) => (
            <button
              key={r}
              onClick={() => setRepoUrl(r)}
              className="text-[10px] px-2 py-0.5 bg-[#1a1a1a] border border-border hover:border-emerald-500 text-muted-foreground hover:text-foreground transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 outline-none"
            >
              {r.replace('https://github.com/', '')}
            </button>
          ))}
        </div>
      </section>

      {/* Repo switcher */}
      {projects.length > 0 && (
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          <span className="text-[9px] uppercase tracking-widest text-muted-foreground">Repository:</span>
          {projects.map((p) => (
            <button
              key={p.key}
              onClick={() => setActiveKey(p.key)}
              className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 border transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 outline-none ${
                activeKey === p.key
                  ? 'bg-emerald-600 border-emerald-500 text-white'
                  : 'bg-[#121212] border-border text-muted-foreground hover:text-foreground hover:border-emerald-500'
              }`}
            >
              {p.key}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div role="alert" className="flex items-start gap-2 bg-[#2a1512] border border-rose-700 text-rose-300 px-4 py-3 mb-5 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Stats */}
      {graph && !loadingGraph && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mb-5">
          {stat(GitCommitHorizontal, 'Commits', graph.stats.total_commits)}
          {stat(GitBranch, 'Branches', graph.stats.total_branches)}
          {stat(Radio, 'Open', graph.stats.open_branches, 'text-emerald-400')}
          {stat(Moon, 'Sleepers', graph.stats.sleeper_branches,
            graph.stats.sleeper_branches > 0 ? 'text-amber-400' : 'text-foreground')}
          {stat(Users, 'Contributors', graph.stats.contributors)}
        </div>
      )}

      {/* Graph */}
      {loadingGraph ? (
        <div className="border border-border bg-[#0e0e0e] py-16 grid place-items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Plotting branch topology…
          </p>
        </div>
      ) : graph ? (
        <>
          {graph.is_live && (
            <p className="text-[10px] uppercase tracking-widest text-emerald-400 mb-2 flex items-center gap-1.5">
              <Radio className="w-3 h-3" /> Live from the GitHub API
            </p>
          )}
          <CommitGraph graph={graph} onSelectCommit={setSelected} />
        </>
      ) : (
        !error && (
          <div className="border border-border bg-[#0e0e0e] p-10 text-center">
            <Github className="w-7 h-7 text-muted-foreground mx-auto mb-3" />
            <p className="text-xs uppercase font-bold text-foreground mb-1">No repository connected</p>
            <p className="text-xs text-muted-foreground">
              Paste a GitHub URL above to plot its branch history.
            </p>
          </div>
        )
      )}

      {/* Selected commit */}
      {selected && (
        <section className="mt-5 bg-[#0e0e0e] border border-border p-4">
          <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
            <div className="flex items-center gap-2">
              <code className="text-[11px] font-bold text-emerald-400">{selected.short_sha}</code>
              <span className="text-[9px] uppercase tracking-widest px-1.5 py-0.5 bg-[#1a1a1a] border border-border text-muted-foreground">
                {selected.branch}
              </span>
              {selected.is_merge && (
                <span className="text-[9px] uppercase tracking-widest text-emerald-400">merge</span>
              )}
            </div>
            <a
              href={selected.url}
              target="_blank"
              rel="noreferrer noopener"
              className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-emerald-500 outline-none"
            >
              View on GitHub <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <p className="text-sm text-foreground mb-2 leading-snug">{selected.message}</p>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
            @{selected.author_username} · {new Date(selected.created_at).toLocaleString()}
            {selected.bug_id && (
              <> · <span className="text-[#B497CF] font-bold">linked to #{selected.bug_id}</span></>
            )}
          </p>
        </section>
      )}
    </main>
  );
};

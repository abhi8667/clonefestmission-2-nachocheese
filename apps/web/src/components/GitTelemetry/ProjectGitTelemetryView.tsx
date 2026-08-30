import React, { useState, useEffect } from 'react';
import {
  GitBranch,
  GitCommit as GitCommitIcon,
  GitPullRequest,
  Users,
  ExternalLink,
  RefreshCw,
  Plus,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Radio,
  Search,
  Filter,
  ArrowRight
} from 'lucide-react';
import { ProjectGitTelemetry, GitCommit, CollaboratorTelemetry } from '@triarc/shared-types';
import { fetchProjectGitTelemetry, simulateProjectCommit } from '../../services/api.ts';
import { useSSE } from '../../context/SSEContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';

interface ProjectGitTelemetryViewProps {
  projectKey: string;
  projectName?: string;
  repoUrl?: string;
}

export const ProjectGitTelemetryView: React.FC<ProjectGitTelemetryViewProps> = ({
  projectKey,
  projectName,
  repoUrl
}) => {
  const { currentUser } = useAuth();
  const { lastEvent } = useSSE();

  const [telemetry, setTelemetry] = useState<ProjectGitTelemetry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [authorFilter, setAuthorFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Simulator Drawer State
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [simAuthor, setSimAuthor] = useState('alex');
  const [simMessage, setSimMessage] = useState('fix: resolve memory leak in sync worker');
  const [simBranch, setSimBranch] = useState('fix/worker-leak');
  const [simBugId, setSimBugId] = useState('');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simSuccess, setSimSuccess] = useState(false);

  const loadTelemetry = async () => {
    try {
      const data = await fetchProjectGitTelemetry(projectKey, currentUser?.id);
      setTelemetry(data);
    } catch (err: any) {
      console.error('Failed to fetch project git telemetry:', err);
      setError(err.message || 'Failed to load git telemetry');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTelemetry();
  }, [projectKey, currentUser?.id]);

  // Real-time update on live git events
  useEffect(() => {
    if (lastEvent?.type === 'git:commit' || lastEvent?.type === 'bug:updated') {
      loadTelemetry();
    }
  }, [lastEvent]);

  const handleSimulateCommit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simMessage.trim()) return;

    setIsSimulating(true);
    try {
      await simulateProjectCommit(
        projectKey,
        {
          author: simAuthor,
          message: simMessage.trim(),
          branch: simBranch.trim() || 'main',
          bugId: simBugId ? Number(simBugId) : undefined
        },
        currentUser?.id
      );
      setSimSuccess(true);
      setTimeout(() => {
        setSimSuccess(false);
        setIsSimulatorOpen(false);
      }, 1000);
      loadTelemetry();
    } catch (err: any) {
      console.error('Simulation error:', err);
    } finally {
      setIsSimulating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-12 text-center font-mono space-y-3">
        <RefreshCw className="w-6 h-6 animate-spin text-[#ea580c] mx-auto" />
        <span className="text-xs uppercase text-muted-foreground block">
          STREAMING COLLABORATOR TELEMETRY & COMMITS...
        </span>
      </div>
    );
  }

  const effectiveRepoUrl = telemetry?.repo_url || repoUrl || `https://github.com/triarc/${projectKey.toLowerCase()}`;
  const allCommits = telemetry?.commits || [];
  const allCollaborators = telemetry?.collaborators || [];
  const allBranches = telemetry?.branches || [];

  // Filter commits
  const filteredCommits = allCommits.filter((c) => {
    const matchAuthor = authorFilter === 'all' || c.author_username === authorFilter || c.author_name === authorFilter;
    const matchSearch =
      !searchQuery.trim() ||
      c.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.short_sha.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.branch.toLowerCase().includes(searchQuery.toLowerCase());
    return matchAuthor && matchSearch;
  });

  return (
    <div className="space-y-6 font-mono animate-fade-in text-foreground">
      {/* Top Banner & Stats */}
      <div className="p-5 bg-[#0d0d0d] border border-border rounded-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 bg-[#ea580c] animate-pulse rounded-xs" />
            <span className="text-[10px] text-[#ea580c] font-bold tracking-widest uppercase">
              // REPO TELEMETRY // REAL-TIME ACTIVITY
            </span>
          </div>
          <h2 className="text-base font-black text-foreground uppercase tracking-wide mt-1 flex items-center gap-2">
            <span>{projectName || projectKey} Git Flow Hub</span>
            <a
              href={effectiveRepoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 border border-border px-2 py-0.5 rounded-xs"
            >
              <span>{effectiveRepoUrl.replace('https://github.com/', '')}</span>
              <ExternalLink className="w-3 h-3 text-[#ea580c]" />
            </a>
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsSimulatorOpen(true)}
            className="px-3.5 py-2 bg-foreground text-background hover:bg-white font-bold text-xs uppercase flex items-center gap-1.5 transition-all rounded-sm"
          >
            <Zap className="w-3.5 h-3.5 text-[#ea580c]" />
            <span>PUSH COMMIT / SIMULATE</span>
          </button>

          <button
            onClick={loadTelemetry}
            aria-label="Refresh telemetry"
            className="p-2 border border-border hover:border-foreground text-muted-foreground hover:text-foreground bg-[#080808] transition-all rounded-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 bg-[#0d0d0d] border border-border rounded-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[10px] uppercase font-bold">TOTAL COMMITS</span>
            <GitCommitIcon className="w-4 h-4 text-[#ea580c]" />
          </div>
          <span className="text-xl font-black text-foreground font-mono">
            {telemetry?.stats.total_commits || allCommits.length}
          </span>
        </div>

        <div className="p-4 bg-[#0d0d0d] border border-border rounded-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[10px] uppercase font-bold">COLLABORATORS</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="text-xl font-black text-foreground font-mono">
            {telemetry?.stats.total_collaborators || allCollaborators.length}
          </span>
        </div>

        <div className="p-4 bg-[#0d0d0d] border border-border rounded-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[10px] uppercase font-bold">ACTIVE BRANCHES</span>
            <GitBranch className="w-4 h-4 text-blue-400" />
          </div>
          <span className="text-xl font-black text-foreground font-mono">
            {telemetry?.stats.active_branches || allBranches.length}
          </span>
        </div>

        <div className="p-4 bg-[#0d0d0d] border border-border rounded-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[10px] uppercase font-bold">OPEN PRS</span>
            <GitPullRequest className="w-4 h-4 text-purple-400" />
          </div>
          <span className="text-xl font-black text-foreground font-mono">
            {telemetry?.stats.open_prs || 0}
          </span>
        </div>
      </div>

      {/* Section 1: Collaborators Live Pulse */}
      <section aria-label="Collaborators Live Pulse" className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Users className="w-4 h-4 text-[#ea580c]" />
            <span>COLLABORATOR WORKFLOW STATUS ({allCollaborators.length})</span>
          </h3>
          <span className="text-[10px] text-muted-foreground uppercase">REAL-TIME ACTIVITY MONITOR</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {allCollaborators.map((collab) => {
            const isSelected = authorFilter === collab.username || authorFilter === collab.name;
            return (
              <div
                key={collab.id}
                onClick={() => setAuthorFilter(isSelected ? 'all' : collab.username)}
                className={`p-4 bg-[#0d0d0d] border transition-all rounded-sm cursor-pointer ${
                  isSelected ? 'border-[#ea580c] ring-1 ring-[#ea580c] bg-[#140c06]' : 'border-border hover:border-foreground'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={collab.avatar_url}
                      alt={collab.name}
                      className="w-9 h-9 rounded-sm border border-border bg-black"
                    />
                    <div>
                      <span className="text-xs font-bold text-foreground block">{collab.name}</span>
                      <span className="text-[10px] text-muted-foreground">@{collab.username}</span>
                    </div>
                  </div>
                  <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase border border-border bg-[#080808] text-foreground rounded-xs">
                    {collab.role}
                  </span>
                </div>

                <div className="pt-2 border-t border-border/60 space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span className="text-foreground font-semibold flex items-center gap-1.5">
                      <Radio className="w-2.5 h-2.5 text-emerald-400 animate-pulse" />
                      <span>{collab.current_status}</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[9px] text-muted-foreground uppercase">
                    <span>{collab.commits_count} commits</span>
                    <span className="text-[#ea580c] font-bold">{collab.active_branch}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Section 2: Live Commits Feed */}
      <section aria-label="Commit Stream" className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0d0d0d] p-3 border border-border rounded-sm">
          <div className="flex items-center gap-2">
            <GitCommitIcon className="w-4 h-4 text-[#ea580c]" />
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
              COMMIT HISTORY & GIT AUDIT STREAM ({filteredCommits.length})
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter commit message or SHA..."
                className="pl-8 pr-3 py-1.5 bg-[#080808] border border-border text-xs text-foreground focus:outline-none focus:border-foreground rounded-sm font-mono w-52"
              />
            </div>

            {authorFilter !== 'all' && (
              <button
                onClick={() => setAuthorFilter('all')}
                className="px-2 py-1 bg-[#ea580c] text-background text-[10px] font-bold uppercase rounded-xs"
              >
                CLEAR FILTER (@{authorFilter})
              </button>
            )}
          </div>
        </div>

        <div className="space-y-2.5">
          {filteredCommits.length === 0 ? (
            <div className="p-8 text-center bg-[#0d0d0d] border border-border rounded-sm text-xs text-muted-foreground uppercase">
              No commits matching the filter criteria.
            </div>
          ) : (
            filteredCommits.map((commit) => (
              <div
                key={commit.sha}
                className="p-3.5 bg-[#0d0d0d] border border-border hover:border-foreground transition-all rounded-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
              >
                <div className="flex items-start gap-3">
                  <img
                    src={commit.author_avatar}
                    alt={commit.author_name}
                    className="w-7 h-7 rounded-sm border border-border bg-black shrink-0 mt-0.5"
                  />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-foreground group-hover:text-[#ea580c] transition-colors">
                        {commit.message}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground uppercase">
                      <span>{commit.author_name} (@{commit.author_username})</span>
                      <span>•</span>
                      <span className="text-[#ea580c] font-bold flex items-center gap-1">
                        <GitBranch className="w-3 h-3" />
                        <span>{commit.branch}</span>
                      </span>
                      <span>•</span>
                      <span>{new Date(commit.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {commit.bug_id && (
                        <>
                          <span>•</span>
                          <span className="bg-[#181818] px-1.5 py-0.2 border border-border text-foreground font-bold">
                            #{commit.bug_id} {commit.bug_title?.slice(0, 25)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={commit.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 bg-[#080808] border border-border hover:border-foreground text-[10px] font-mono font-bold text-foreground flex items-center gap-1.5 rounded-xs"
                  >
                    <span>{commit.short_sha}</span>
                    <ExternalLink className="w-3 h-3 text-[#ea580c]" />
                  </a>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Section 3: Branches & Sleeper Radar */}
      <section aria-label="Branch Activity Radar" className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-[#ea580c]" />
            <span>BRANCHES & SLEEPER RADAR ({allBranches.length})</span>
          </h3>
          <span className="text-[10px] text-muted-foreground uppercase">AUTOMATED SLEEPER DETECTION (&gt;3 DAYS IDLE)</span>
        </div>


        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {allBranches.map((br) => (
            <div
              key={br.name}
              className={`p-3 bg-[#0d0d0d] border rounded-sm ${
                br.is_sleeper ? 'border-amber-500/60 bg-amber-950/10' : 'border-border'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <GitBranch className="w-3.5 h-3.5 text-[#ea580c]" />
                  <span>{br.name}</span>
                </span>
                {br.is_sleeper ? (
                  <span className="px-1.5 py-0.2 text-[9px] font-bold uppercase bg-amber-950 text-amber-300 border border-amber-600 rounded-xs flex items-center gap-1">
                    <AlertTriangle className="w-2.5 h-2.5" />
                    <span>SLEEPER BRANCH</span>
                  </span>
                ) : (
                  <span className="px-1.5 py-0.2 text-[9px] font-bold uppercase bg-emerald-950 text-emerald-300 border border-emerald-600 rounded-xs">
                    ACTIVE
                  </span>
                )}
              </div>
              <div className="text-[10px] text-muted-foreground uppercase flex items-center justify-between">
                <span>Author: {br.author}</span>
                <span>{new Date(br.last_commit_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Simulator Modal */}
      {isSimulatorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm font-mono">
          <div className="w-full max-w-lg bg-[#0d0d0d] border-2 border-foreground p-6 shadow-2xl space-y-4 text-foreground">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <span className="text-xs font-bold uppercase text-foreground flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#ea580c]" />
                <span>SIMULATE COLLABORATOR COMMIT</span>
              </span>
              <button onClick={() => setIsSimulatorOpen(false)} className="text-muted-foreground hover:text-foreground">
                ✕
              </button>
            </div>

            {simSuccess && (
              <div className="p-3 bg-emerald-950 border border-emerald-500 text-emerald-200 text-xs uppercase flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>COMMIT BROADCAST LIVE ACROSS SSE STREAM!</span>
              </div>
            )}

            <form onSubmit={handleSimulateCommit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">
                  Collaborator Author
                </label>
                <select
                  value={simAuthor}
                  onChange={(e) => setSimAuthor(e.target.value)}
                  className="w-full p-2 bg-[#080808] border border-border text-xs text-foreground font-mono focus:border-foreground"
                >
                  <option value="alex">Alex River (@alex)</option>
                  <option value="sam">Sam Patel (@sam)</option>
                  <option value="priya">Priya Sharma (@priya)</option>
                  <option value="gaearon">Dan Abramov (@gaearon)</option>
                  <option value="acdlite">Andrew Clark (@acdlite)</option>
                  <option value="sophiebits">Sophie Alpert (@sophiebits)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">
                  Commit Message
                </label>
                <input
                  type="text"
                  required
                  value={simMessage}
                  onChange={(e) => setSimMessage(e.target.value)}
                  placeholder="e.g. Fixes #412: resolve offline queue crash"
                  className="w-full p-2 bg-[#080808] border border-border text-xs text-foreground font-mono focus:border-foreground"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">
                    Branch
                  </label>
                  <input
                    type="text"
                    value={simBranch}
                    onChange={(e) => setSimBranch(e.target.value)}
                    placeholder="main or fix/patch"
                    className="w-full p-2 bg-[#080808] border border-border text-xs text-foreground font-mono focus:border-foreground"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">
                    Link Issue # (Optional)
                  </label>
                  <input
                    type="number"
                    value={simBugId}
                    onChange={(e) => setSimBugId(e.target.value)}
                    placeholder="e.g. 412"
                    className="w-full p-2 bg-[#080808] border border-border text-xs text-foreground font-mono focus:border-foreground"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsSimulatorOpen(false)}
                  className="px-3 py-1.5 border border-border text-muted-foreground text-xs uppercase font-bold"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={isSimulating}
                  className="px-4 py-1.5 bg-foreground text-background font-bold text-xs uppercase hover:bg-white flex items-center gap-1.5"
                >
                  {isSimulating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                  <span>PUSH COMMIT</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

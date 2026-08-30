import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import { fetchProjects, fetchAttentionCounts, createProject } from '../services/api.ts';
import { Project, ProjectAttentionSummary, CreateProjectInput } from '@triarc/shared-types';
import {
  FolderKanban,
  AlertTriangle,
  Inbox,
  Eye,
  Plus,
  GitBranch,
  ArrowRight,
  Shield,
  Activity,
  CheckCircle2,
  Loader2,
  X
} from 'lucide-react';
import { AnimatedCounter } from '../components/Cyber/AnimatedCounter.tsx';
import { EmptyState } from '../components/Common/EmptyState.tsx';
import { CardSkeleton } from '../components/Common/LoadingSkeleton.tsx';

export const ProjectsListView: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [projects, setProjects] = useState<Project[]>([]);
  const [attention, setAttention] = useState<ProjectAttentionSummary>({
    assigned_to_me: 0,
    incoming_requests: 0,
    watching_changed: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  // New Project Modal State (for Admins)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newRepo, setNewRepo] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [projList, attCounts] = await Promise.all([
        fetchProjects(currentUser?.id),
        fetchAttentionCounts(currentUser?.id)
      ]);
      setProjects(projList);
      setAttention(attCounts);
    } catch (err) {
      console.error('Failed to load projects data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser?.id]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.trim() || !newName.trim()) {
      setCreateError('Project Key and Project Name are required');
      return;
    }

    setIsCreating(true);
    setCreateError(null);

    try {
      const input: CreateProjectInput = {
        key: newKey.trim().toUpperCase(),
        name: newName.trim(),
        description: newDesc.trim() || undefined,
        repo_url: newRepo.trim() || undefined
      };
      await createProject(input, currentUser?.id);
      setIsCreateModalOpen(false);
      setNewKey('');
      setNewName('');
      setNewDesc('');
      setNewRepo('');
      loadData();
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create project');
    } finally {
      setIsCreating(false);
    }
  };

  const isAdmin = currentUser?.role === 'admin';

  return (
    <main
      aria-labelledby="projects-heading"
      className="space-y-6 animate-fade-in font-mono"
      id="main-content"
    >
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0d0d0d] p-5 border border-border shadow-sm rounded-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-foreground text-background flex items-center justify-center font-bold rounded-sm">
              <FolderKanban className="w-4 h-4 text-background" />
            </div>
            <div>
              <span className="text-[10px] text-[#ea580c] font-bold tracking-wider uppercase block">
                PROJECT PORTFOLIO
              </span>
              <h1 id="projects-heading" className="text-lg font-black text-foreground uppercase tracking-wide">
                Projects & Workspaces
              </h1>
            </div>
          </div>
          <p className="text-xs text-muted-foreground uppercase">
            Select a project to inspect its incident matrix, flow telemetry, or configuration settings.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 bg-foreground text-background font-bold text-xs uppercase flex items-center gap-2 hover:bg-white transition-all rounded-sm shrink-0 focus-visible:ring-2 focus-visible:ring-[#ea580c] outline-none"
            aria-label="Create new project workspace"
          >
            <Plus className="w-4 h-4" />
            <span>NEW PROJECT</span>
          </button>
        )}
      </div>

      {/* Region 1: Needs Your Attention Strip */}
      <section aria-label="Items needing your attention" className="space-y-2.5">
        <h2 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-[#ea580c]" />
          <span>NEEDS YOUR ATTENTION</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {/* Assigned to Me */}
          <button
            onClick={() => {
              const defaultKey = projects[0]?.key || 'CORE';
              navigate(`/projects/${defaultKey}?assignee=me`);
            }}
            className="p-4 bg-[#0d0d0d] hover:bg-[#141414] border border-border hover:border-foreground text-left transition-all rounded-sm flex items-center justify-between group focus-visible:ring-2 focus-visible:ring-[#ea580c] outline-none"
          >
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block tracking-wider">
                ASSIGNED TO ME (OPEN)
              </span>
              <p className="text-2xl font-black text-foreground">
                {isLoading ? '—' : <AnimatedCounter value={attention.assigned_to_me ?? 0} />}
              </p>
              <span className="text-[10px] text-muted-foreground uppercase">Across all projects</span>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all" />
          </button>

          {/* Incoming Requests */}
          <button
            onClick={() => navigate('/inbox')}
            className="p-4 bg-[#0d0d0d] hover:bg-[#141414] border border-border hover:border-[#ea580c] text-left transition-all rounded-sm flex items-center justify-between group focus-visible:ring-2 focus-visible:ring-[#ea580c] outline-none"
          >
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-[#ea580c] block tracking-wider flex items-center gap-1.5">
                <Inbox className="w-3 h-3 text-[#ea580c]" />
                <span>INCOMING REQUESTS</span>
              </span>
              <p className="text-2xl font-black text-[#ea580c]">
                {isLoading ? '—' : <AnimatedCounter value={attention.incoming_requests ?? 0} />}
              </p>
              <span className="text-[10px] text-muted-foreground uppercase">Awaiting review? / approval?</span>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-[#ea580c] group-hover:translate-x-1 transition-all" />
          </button>

          {/* Watched Bugs Changed */}
          <button
            onClick={() => {
              const defaultKey = projects[0]?.key || 'CORE';
              navigate(`/projects/${defaultKey}?is_watched=true`);
            }}
            className="p-4 bg-[#0d0d0d] hover:bg-[#141414] border border-border hover:border-foreground text-left transition-all rounded-sm flex items-center justify-between group focus-visible:ring-2 focus-visible:ring-[#ea580c] outline-none"
          >
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block tracking-wider flex items-center gap-1.5">
                <Eye className="w-3 h-3" />
                <span>WATCHED INCIDENTS</span>
              </span>
              <p className="text-2xl font-black text-foreground">
                {isLoading ? '—' : <AnimatedCounter value={attention.watching_changed ?? 0} />}
              </p>
              <span className="text-[10px] text-muted-foreground uppercase">Updated in past 7 days</span>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all" />
          </button>
        </div>
      </section>

      {/* Region 2: Project Cards Grid */}
      <section aria-label="Project workspaces list" className="space-y-3">
        <h2 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <FolderKanban className="w-3.5 h-3.5 text-foreground" />
          <span>ACTIVE WORKSPACES ({projects.length})</span>
        </h2>

        {isLoading ? (
          <CardSkeleton count={3} />
        ) : projects.length === 0 ? (
          <EmptyState
            icon={FolderKanban}
            title="No Projects Available"
            description="You are currently not enrolled as a member of any project workspace."
            actionLabel={isAdmin ? 'CREATE FIRST PROJECT' : undefined}
            onAction={isAdmin ? () => setIsCreateModalOpen(true) : undefined}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => {
              const isStalled = (project.stalled_bugs_count || 0) > 0;
              return (
                <div
                  key={project.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`Open project workspace ${project.name} (${project.key})`}
                  onClick={() => navigate(`/projects/${project.key}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate(`/projects/${project.key}`);
                    }
                  }}
                  className="p-5 bg-[#0d0d0d] hover:bg-[#121212] border border-border hover:border-foreground transition-all rounded-sm flex flex-col justify-between cursor-pointer group shadow-sm focus-visible:ring-2 focus-visible:ring-[#ea580c] outline-none"
                >
                  <div className="space-y-3">
                    {/* Top row: Key + Role + Health */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="px-2 py-0.5 bg-foreground text-background font-bold text-xs uppercase tracking-wider rounded-xs">
                        {project.key}
                      </span>

                      <div className="flex items-center gap-2">
                        <span
                          className={`px-1.5 py-0.2 text-[9px] font-bold uppercase border rounded-xs ${
                            project.user_role === 'admin'
                              ? 'bg-purple-950 text-purple-300 border-purple-600'
                              : project.user_role === 'triager'
                              ? 'bg-amber-950 text-amber-300 border-amber-600'
                              : 'bg-blue-950 text-blue-300 border-blue-600'
                          }`}
                        >
                          {project.user_role || 'MEMBER'}
                        </span>

                        {isStalled ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 text-[9px] font-bold bg-[#ea580c] text-background uppercase rounded-xs">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            <span>{project.stalled_bugs_count} STALLED</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 text-[9px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-600 uppercase rounded-xs">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            <span>HEALTHY</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Title & Description */}
                    <div>
                      <h3 className="text-sm font-bold text-foreground group-hover:text-[#ea580c] transition-colors uppercase leading-snug">
                        {project.name}
                      </h3>
                      <p className="text-[11px] text-muted-foreground line-clamp-2 mt-1 uppercase leading-relaxed">
                        {project.description || 'No description provided for this project workspace.'}
                      </p>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border text-[11px]">
                      <div className="p-2 bg-[#080808] border border-border rounded-xs">
                        <span className="text-[9px] text-muted-foreground uppercase font-bold block">
                          OPEN INCIDENTS
                        </span>
                        <span className="text-base font-bold text-foreground">
                          {project.open_bugs_count || 0}
                        </span>
                      </div>
                      <div className="p-2 bg-[#080808] border border-border rounded-xs">
                        <span className="text-[9px] text-muted-foreground uppercase font-bold block">
                          ASSIGNED TO ME
                        </span>
                        <span className="text-base font-bold text-[#ea580c]">
                          {project.assigned_to_me_count || 0}
                        </span>
                      </div>
                    </div>

                    {/* Linked Repo */}
                    {project.repo_url && (
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground truncate pt-1">
                        <GitBranch className="w-3 h-3 shrink-0" />
                        <span className="truncate">{project.repo_url.replace('https://github.com/', '')}</span>
                      </div>
                    )}
                  </div>

                  {/* Open Project CTA */}
                  <div className="pt-4 mt-4 border-t border-border flex items-center justify-between text-xs font-bold text-foreground group-hover:text-[#ea580c] transition-colors uppercase">
                    <span>EXPLORE ISSUES</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* New Project Modal (Admin only) */}
      {isCreateModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-project-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs font-mono"
          onClick={() => setIsCreateModalOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-[#0d0d0d] border border-border shadow-2xl p-6 rounded-sm space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <FolderKanban className="w-4 h-4 text-[#ea580c]" />
                <h3 id="new-project-title" className="text-xs font-bold text-foreground uppercase tracking-wider">
                  CREATE NEW PROJECT WORKSPACE
                </h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {createError && (
              <div role="alert" className="p-3 bg-red-950/40 border border-red-500 text-red-300 text-xs rounded-sm uppercase">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label htmlFor="new-proj-key" className="block text-[10px] font-bold text-foreground uppercase mb-1">
                    KEY (SLUG) *
                  </label>
                  <input
                    id="new-proj-key"
                    type="text"
                    required
                    maxLength={8}
                    placeholder="PAY"
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-[#080808] border border-border focus:border-foreground text-foreground text-xs uppercase rounded-sm outline-none font-bold"
                  />
                </div>

                <div className="col-span-2">
                  <label htmlFor="new-proj-name" className="block text-[10px] font-bold text-foreground uppercase mb-1">
                    PROJECT NAME *
                  </label>
                  <input
                    id="new-proj-name"
                    type="text"
                    required
                    placeholder="Payment Settlement Engine"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full px-3 py-2 bg-[#080808] border border-border focus:border-foreground text-foreground text-xs rounded-sm outline-none"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="new-proj-desc" className="block text-[10px] font-bold text-foreground uppercase mb-1">
                  DESCRIPTION
                </label>
                <textarea
                  id="new-proj-desc"
                  rows={2}
                  placeholder="Ledger consistency and webhook processing pipeline..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-[#080808] border border-border focus:border-foreground text-foreground text-xs rounded-sm outline-none resize-none"
                />
              </div>

              <div>
                <label htmlFor="new-proj-repo" className="block text-[10px] font-bold text-foreground uppercase mb-1">
                  LINKED GITHUB REPOSITORY URL
                </label>
                <input
                  id="new-proj-repo"
                  type="url"
                  placeholder="https://github.com/triarc/payment-gateway"
                  value={newRepo}
                  onChange={(e) => setNewRepo(e.target.value)}
                  className="w-full px-3 py-2 bg-[#080808] border border-border focus:border-foreground text-foreground text-xs rounded-sm outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-3 py-2 border border-border text-muted-foreground hover:text-foreground text-xs uppercase rounded-sm"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-4 py-2 bg-foreground text-background font-bold text-xs uppercase flex items-center gap-2 hover:bg-white rounded-sm disabled:opacity-50"
                >
                  {isCreating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>INITIALIZE PROJECT</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
};

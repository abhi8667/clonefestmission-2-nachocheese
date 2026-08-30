import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import { useSSE } from '../context/SSEContext.tsx';
import { fetchBugs, fetchProjectByKey } from '../services/api.ts';
import { TableView } from '../components/BugList/TableView.tsx';
import { CardView } from '../components/BugList/CardView.tsx';
import { FilterBar } from '../components/BugList/FilterBar.tsx';
import { DigestBanner } from '../components/Digest/DigestBanner.tsx';
import { NewBugModal } from '../components/NewBug/NewBugModal.tsx';
import { ProjectGitTelemetryView } from '../components/GitTelemetry/ProjectGitTelemetryView.tsx';
import { Bug, Project } from '@triarc/shared-types';
import {
  FolderKanban,
  Activity,
  Plus,
  Settings,
  TrendingUp,
  AlertCircle,
  Loader2,
  Table,
  LayoutGrid,
  GitCommit,
  Users
} from 'lucide-react';

export const ProjectIssuesView: React.FC = () => {
  const { key = 'CORE' } = useParams<{ key: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentUser } = useAuth();
  const { lastEvent } = useSSE();

  // Tab mode: 'issues' | 'git'
  const activeTab = searchParams.get('tab') === 'git' ? 'git' : 'issues';

  // URL query params synchronization
  const searchQuery = searchParams.get('query') || '';
  const statusFilter = searchParams.get('status') || '';
  const componentFilter = searchParams.get('component') || '';
  const priorityFilter = searchParams.get('priority') || '';
  const assigneeFilter = searchParams.get('assignee') || '';

  const [project, setProject] = useState<Project | null>(null);
  const [bugs, setBugs] = useState<Bug[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [isNewBugOpen, setIsNewBugOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);


  // Helper to update search params
  const updateFilter = useCallback((paramName: string, value: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) {
        next.set(paramName, value);
      } else {
        next.delete(paramName);
      }
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const loadProject = useCallback(async () => {
    try {
      const res = await fetchProjectByKey(key, currentUser?.id);
      setProject(res.project);
    } catch (err: any) {
      console.error('Failed to load project:', err);
      setError(err.message || 'Project not found');
    }
  }, [key, currentUser?.id]);

  const loadBugs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchBugs({
        project: key,
        query: searchQuery || undefined,
        status: statusFilter || undefined,
        component: componentFilter || undefined,
        priority: priorityFilter || undefined,
        assignee: assigneeFilter || undefined,
        userId: currentUser?.id
      });
      setBugs(res.bugs);
      setTotalCount(res.count);
    } catch (err: any) {
      console.error('Failed to load project bugs:', err);
      setError(err.message || 'Failed to fetch issues');
    } finally {
      setIsLoading(false);
    }
  }, [key, searchQuery, statusFilter, componentFilter, priorityFilter, assigneeFilter, currentUser?.id]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  useEffect(() => {
    loadBugs();
  }, [loadBugs]);

  useEffect(() => {
    if (lastEvent) {
      loadBugs();
    }
  }, [lastEvent, loadBugs]);

  const handleSelectBug = (bugId: number) => {
    navigate(`/projects/${key.toUpperCase()}/issues/${bugId}`);
  };

  const hasFilters = Boolean(searchQuery || statusFilter || componentFilter || priorityFilter || assigneeFilter);

  const clearAllFilters = () => {
    setSearchParams(new URLSearchParams(), { replace: true });
  };

  const isProjectAdmin = project?.user_role === 'admin' || currentUser?.role === 'admin';

  return (
    <main className="space-y-6 animate-fade-in font-mono" id="main-content">
      {/* Project Sub-Navigation & Header Bar */}
      <div className="bg-[#0d0d0d] border border-border shadow-sm rounded-sm overflow-hidden">
        <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <Link
                to="/projects"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors uppercase font-bold flex items-center gap-1"
              >
                <span>PROJECTS</span>
                <span>/</span>
              </Link>
              <span className="px-2 py-0.5 bg-foreground text-background font-bold text-xs uppercase rounded-xs">
                {key.toUpperCase()}
              </span>
              <span
                className={`px-1.5 py-0.2 text-[9px] font-bold uppercase border rounded-xs ${
                  project?.user_role === 'admin'
                    ? 'bg-purple-950 text-purple-300 border-purple-600'
                    : project?.user_role === 'triager'
                    ? 'bg-amber-950 text-amber-300 border-amber-600'
                    : 'bg-blue-950 text-blue-300 border-blue-600'
                }`}
              >
                ROLE: {project?.user_role || 'MEMBER'}
              </span>
            </div>

            <h1 className="text-xl font-black text-foreground uppercase tracking-tight">
              {project?.name || `${key.toUpperCase()} WORKSPACE`}
            </h1>
            <p className="text-xs text-muted-foreground uppercase">
              {project?.description || 'Active incident triage and lifecycle telemetry matrix.'}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => setIsNewBugOpen(true)}
              className="px-4 py-2 bg-foreground text-background font-bold text-xs uppercase flex items-center gap-2 hover:bg-white transition-all rounded-sm"
              aria-label="Report new incident in this project"
            >
              <Plus className="w-4 h-4" />
              <span>NEW ISSUE</span>
            </button>
          </div>
        </div>

        {/* Project View Tabs Bar */}
        <nav aria-label="Project Sections" className="flex items-center px-5 gap-1 bg-[#101010] text-xs">
          <Link
            to={`/projects/${key}`}
            className={`py-3 px-4 font-bold border-b-2 flex items-center gap-2 uppercase transition-all ${
              activeTab === 'issues'
                ? 'border-[#B497CF] text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            }`}
          >
            <Activity className={`w-4 h-4 ${activeTab === 'issues' ? 'text-[#B497CF]' : ''}`} />
            <span>ISSUES ({totalCount})</span>
          </Link>

          <Link
            to={`/projects/${key}?tab=git`}
            className={`py-3 px-4 font-bold border-b-2 flex items-center gap-2 uppercase transition-all ${
              activeTab === 'git'
                ? 'border-[#B497CF] text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            }`}
          >
            <GitCommit className={`w-4 h-4 ${activeTab === 'git' ? 'text-[#B497CF]' : ''}`} />
            <span>COMMITS & COLLABORATORS</span>
          </Link>

          <Link
            to={`/projects/${key}/analytics`}
            className="py-3 px-4 font-bold border-b-2 border-transparent text-muted-foreground hover:text-foreground hover:border-border flex items-center gap-2 uppercase transition-all"
          >
            <TrendingUp className="w-4 h-4" />
            <span>FLOW ANALYTICS</span>
          </Link>

          {isProjectAdmin && (
            <Link
              to={`/projects/${key}/settings`}
              className="py-3 px-4 font-bold border-b-2 border-transparent text-muted-foreground hover:text-foreground hover:border-border flex items-center gap-2 uppercase transition-all ml-auto"
            >
              <Settings className="w-4 h-4" />
              <span>SETTINGS</span>
            </Link>
          )}
        </nav>
      </div>

      {activeTab === 'git' ? (
        /* Git Commits & Collaborator Activity Telemetry View */
        <ProjectGitTelemetryView
          projectKey={key}
          projectName={project?.name}
          repoUrl={project?.repo_url}
        />
      ) : (
        /* Issues Matrix View */
        <>
          {/* Notifications Briefing */}
          <DigestBanner onSelectBug={handleSelectBug} />

          {/* Filter Toolbar */}
          <FilterBar
            viewMode={viewMode}
            setViewMode={setViewMode}
            searchQuery={searchQuery}
            setSearchQuery={(val) => updateFilter('query', val)}
            statusFilter={statusFilter}
            setStatusFilter={(val) => updateFilter('status', val)}
            componentFilter={componentFilter}
            setComponentFilter={(val) => updateFilter('component', val)}
            priorityFilter={priorityFilter}
            setPriorityFilter={(val) => updateFilter('priority', val)}
            assigneeFilter={assigneeFilter}
            setAssigneeFilter={(val) => updateFilter('assignee', val)}
            totalCount={totalCount}
          />

          {/* Error Alert */}
          {error && (
            <div role="alert" className="p-4 bg-red-950/40 border border-red-500 text-red-300 text-xs rounded-sm uppercase flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Issues Content Area */}
          {isLoading ? (
            <div className="p-16 flex flex-col items-center justify-center gap-2 text-muted-foreground font-mono uppercase border border-border bg-[#0d0d0d] rounded-sm">
              <Loader2 className="w-6 h-6 animate-spin text-foreground" />
              <p className="text-xs">Synchronizing project incidents...</p>
            </div>
          ) : bugs.length === 0 ? (
            <div className="p-16 text-center border border-border bg-[#0d0d0d] rounded-sm space-y-3">
              <FolderKanban className="w-8 h-8 text-muted-foreground mx-auto" />
              <h3 className="text-sm font-bold uppercase text-foreground">
                {hasFilters ? 'No Matching Issues Found' : 'No Issues Reported Yet'}
              </h3>
              <p className="text-xs text-muted-foreground uppercase max-w-md mx-auto">
                {hasFilters
                  ? 'No incidents matched your query and filter criteria in this project.'
                  : `The ${key.toUpperCase()} workspace has zero active incidents.`}
              </p>
              {hasFilters ? (
                <button
                  onClick={clearAllFilters}
                  className="px-4 py-2 border border-border bg-[#141414] hover:bg-[#222] text-foreground text-xs uppercase rounded-sm font-bold inline-block mt-2"
                >
                  CLEAR ACTIVE FILTERS
                </button>
              ) : (
                <button
                  onClick={() => setIsNewBugOpen(true)}
                  className="px-4 py-2 bg-foreground text-background font-bold text-xs uppercase inline-flex items-center gap-2 hover:bg-white rounded-sm mt-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>REPORT FIRST ISSUE</span>
                </button>
              )}
            </div>
          ) : viewMode === 'table' ? (
            <TableView
              bugs={bugs}
              onSelectBug={handleSelectBug}
              onBugsUpdated={loadBugs}
            />
          ) : (
            <CardView
              bugs={bugs}
              onSelectBug={handleSelectBug}
            />
          )}
        </>
      )}


      {/* New Bug Modal */}
      <NewBugModal
        isOpen={isNewBugOpen}
        onClose={() => setIsNewBugOpen(false)}
        onBugCreated={(id) => {
          loadBugs();
          handleSelectBug(id);
        }}
        onSelectBug={handleSelectBug}
      />
    </main>
  );
};

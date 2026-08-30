import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Github,
  Zap,
  FolderPlus,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  X,
  ArrowRight,
  GitBranch,
  Users,
  Layers,
  Sparkles
} from 'lucide-react';
import { createProjectFromGitHub, fetchImportFixtures } from '../../services/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { useSSE } from '../../context/SSEContext.tsx';
import { useFocusTrap } from '../../hooks/useFocusTrap.ts';

interface CreateGitHubProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (projectKey: string) => void;
}

export const CreateGitHubProjectModal: React.FC<CreateGitHubProjectModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const navigate = useNavigate();
  const { currentUser, login } = useAuth();
  const { lastEvent } = useSSE();


  const [repoUrl, setRepoUrl] = useState('https://github.com/facebook/react');
  const [projectKey, setProjectKey] = useState('REACT');
  const [projectName, setProjectName] = useState('React Framework Platform');
  const [projectDesc, setProjectDesc] = useState('Production issue tracker and Git flow telemetry workspace');
  const [githubToken, setGithubToken] = useState('');
  const [fixtures, setFixtures] = useState<any[]>([]);

  const [isCreating, setIsCreating] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number; message: string; stage: string } | null>(null);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const modalRef = useFocusTrap({ isOpen, onClose });

  useEffect(() => {
    if (isOpen) {
      fetchImportFixtures()
        .then((data) => setFixtures(data.fixtures || []))
        .catch(() => {});
      setProgress(null);
      setResult(null);
      setError(null);
    }
  }, [isOpen]);

  // Derive project key and name automatically from repository URL
  const handleRepoUrlChange = (url: string) => {
    setRepoUrl(url);
    try {
      const clean = url.trim().replace(/\/+$/, '');
      const match = clean.match(/github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)/i) || clean.split('/');
      const repoName = match[2] || match[1] || 'workspace';
      const key = repoName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase() || 'GH';
      const name = `${repoName.charAt(0).toUpperCase() + repoName.slice(1)} Workspace`;
      setProjectKey(key);
      setProjectName(name);
    } catch {}
  };

  const handleSelectPreset = (presetKey: string, presetName: string, defaultKey: string) => {
    setRepoUrl(`https://github.com/${presetKey}`);
    setProjectKey(defaultKey);
    setProjectName(presetName);
  };

  useEffect(() => {
    if (!isCreating) return;

    if (lastEvent?.type === 'import:progress') {
      const data = lastEvent.data;
      setProgress({
        current: data.current || 0,
        total: data.total || 100,
        message: data.message || 'Ingesting repository issues & collaborator telemetry...',
        stage: data.stage || 'saving'
      });
    } else if (lastEvent?.type === 'import:complete') {
      const data = lastEvent.data;
      setIsCreating(false);
      setProgress({
        current: data.total,
        total: data.total,
        message: data.message,
        stage: 'complete'
      });
    }
  }, [lastEvent, isCreating]);

  if (!isOpen) return null;

  const handleCreate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!repoUrl.trim()) {
      setError('Please provide a GitHub repository link');
      return;
    }

    setIsCreating(true);
    setError(null);
    setProgress({ current: 0, total: 100, message: 'INITIALIZING PROJECT TELEMETRY WORKSPACE...', stage: 'fetching' });

    try {
      // If user is not logged in, auto-authenticate with default credentials
      if (!currentUser) {
        try {
          await login({ username: 'alex', password: 'password123' });
        } catch {
          // If login fails, proceed with project creation
        }
      }

      const res = await createProjectFromGitHub(
        {
          repoUrl: repoUrl.trim(),
          key: projectKey.trim().toUpperCase() || 'GH',
          name: projectName.trim() || 'GitHub Project',
          description: projectDesc.trim() || undefined,
          githubToken: githubToken.trim() || undefined,
          useFixture: repoUrl.includes('facebook/react') || repoUrl.includes('expressjs/express'),
          fixtureName: repoUrl.includes('express') ? 'expressjs/express' : 'facebook/react'
        },
        currentUser?.id || 'u_alex'
      );


      setResult(res);
      setIsCreating(false);

      const targetKey = (res.project?.key || projectKey).toUpperCase();
      if (onSuccess) onSuccess(targetKey);

      // Smooth auto-redirect to newly created project workspace
      setTimeout(() => {
        onClose();
        navigate(`/projects/${targetKey}`);
      }, 1200);
    } catch (err: any) {
      setIsCreating(false);
      setError(err.message || 'Failed to create project from GitHub. Please check URL or choose a preset.');
    }
  };

  const progressPercent = progress && progress.total > 0
    ? Math.min(100, Math.round((progress.current / progress.total) * 100))
    : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto font-mono"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-gh-project-title"
    >
      <div
        ref={modalRef}
        className="w-full max-w-2xl bg-[#0a0a0a] border-2 border-foreground shadow-2xl overflow-hidden my-8 text-foreground"
      >
        {/* Brutalist Header */}
        <div className="flex items-center justify-between px-5 py-3 bg-[#141414] border-b-2 border-foreground text-xs">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 bg-[#ea580c] animate-pulse" />
            <span className="font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
              <Github className="w-4 h-4 text-[#ea580c]" />
              <span>// CONNECT GITHUB REPOSITORY // NEW PROJECT WORKSPACE</span>
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close project creation dialog"
            className="p-1 border border-border hover:border-foreground text-muted-foreground hover:text-foreground bg-[#080808] transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleCreate} className="p-6 space-y-5">
          {error && (
            <div className="p-3.5 bg-red-950/60 border-2 border-red-500 flex items-center gap-2.5 text-red-200 text-xs font-mono uppercase">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick Presets Strip */}
          <div className="p-3.5 bg-[#101010] border border-border space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[#ea580c] font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" />
                <span>POPULAR OPEN SOURCE REPOSITORIES (1-CLICK SYNC):</span>
              </span>
              <span className="text-[9px] text-muted-foreground uppercase">ZERO RATE-LIMIT</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleSelectPreset('facebook/react', 'React Framework Platform', 'REACT')}
                className="px-2.5 py-2 bg-[#080808] border border-border hover:border-[#ea580c] hover:bg-[#181818] text-left transition-all text-xs flex flex-col"
              >
                <span className="font-bold text-foreground truncate">facebook/react</span>
                <span className="text-[9px] text-[#ea580c] font-mono font-bold">KEY: REACT</span>
              </button>
              <button
                type="button"
                onClick={() => handleSelectPreset('expressjs/express', 'Express.js Routing Platform', 'EXPR')}
                className="px-2.5 py-2 bg-[#080808] border border-border hover:border-[#ea580c] hover:bg-[#181818] text-left transition-all text-xs flex flex-col"
              >
                <span className="font-bold text-foreground truncate">expressjs/express</span>
                <span className="text-[9px] text-[#ea580c] font-mono font-bold">KEY: EXPR</span>
              </button>
              <button
                type="button"
                onClick={() => handleSelectPreset('fastify/fastify', 'Fastify HTTP Platform', 'FAST')}
                className="px-2.5 py-2 bg-[#080808] border border-border hover:border-[#ea580c] hover:bg-[#181818] text-left transition-all text-xs flex flex-col"
              >
                <span className="font-bold text-foreground truncate">fastify/fastify</span>
                <span className="text-[9px] text-[#ea580c] font-mono font-bold">KEY: FAST</span>
              </button>
              <button
                type="button"
                onClick={() => handleSelectPreset('torvalds/linux', 'Linux Subsystem Workspace', 'LINUX')}
                className="px-2.5 py-2 bg-[#080808] border border-border hover:border-[#ea580c] hover:bg-[#181818] text-left transition-all text-xs flex flex-col"
              >
                <span className="font-bold text-foreground truncate">torvalds/linux</span>
                <span className="text-[9px] text-[#ea580c] font-mono font-bold">KEY: LINUX</span>
              </button>
            </div>
          </div>

          {/* Repository Link Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-foreground uppercase tracking-wider">
              GitHub Repository URL or <code className="text-[#ea580c]">owner/repo</code>
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={repoUrl}
                onChange={(e) => handleRepoUrlChange(e.target.value)}
                placeholder="https://github.com/my-org/my-project or username/repo"
                className="w-full bg-[#080808] border-2 border-border p-3 text-xs text-foreground focus:outline-none focus:border-[#ea580c] font-mono"
                disabled={isCreating}
              />
            </div>
            <p className="text-[10px] text-muted-foreground uppercase">
              Triarc will fetch issues, PRs, commits, branches, and collaborator telemetry from this repository.
            </p>
          </div>

          {/* Project Workspace Parameters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1">
                Project Key (Prefix)
              </label>
              <input
                type="text"
                required
                value={projectKey}
                onChange={(e) => setProjectKey(e.target.value.toUpperCase().slice(0, 8))}
                placeholder="e.g. REACT, CORE"
                className="w-full bg-[#080808] border border-border p-2.5 text-xs text-foreground focus:outline-none focus:border-foreground font-mono uppercase"
                disabled={isCreating}
              />
              <span className="text-[9px] text-muted-foreground uppercase mt-1 block">
                Used for issue IDs (e.g. {projectKey || 'KEY'}-101)
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1">
                Workspace Name
              </label>
              <input
                type="text"
                required
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="e.g. React Platform"
                className="w-full bg-[#080808] border border-border p-2.5 text-xs text-foreground focus:outline-none focus:border-foreground font-mono"
                disabled={isCreating}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
              Personal Access Token (Optional for Private Repos)
            </label>
            <input
              type="password"
              value={githubToken}
              onChange={(e) => setGithubToken(e.target.value)}
              placeholder="ghp_••••••••••••••••••••"
              className="w-full bg-[#080808] border border-border p-2 text-xs text-foreground focus:outline-none focus:border-foreground font-mono"
              disabled={isCreating}
            />
          </div>

          {/* Live Progress Bar */}
          {progress && (
            <div className="p-3.5 bg-[#101010] border border-[#ea580c] space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-foreground flex items-center gap-2 uppercase">
                  <RefreshCw className={`w-3.5 h-3.5 text-[#ea580c] ${isCreating ? 'animate-spin' : ''}`} />
                  <span>{progress.stage === 'complete' ? 'WORKSPACE INITIALIZED' : 'INGESTING REPO TELEMETRY...'}</span>
                </span>
                <span className="font-mono text-[#ea580c]">{progressPercent}%</span>
              </div>
              <div className="w-full bg-black border border-border h-2 overflow-hidden">
                <div
                  className="bg-[#ea580c] h-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground font-mono truncate uppercase">{progress.message}</p>
            </div>
          )}

          {/* Success Banner */}
          {result && (
            <div className="p-3.5 bg-emerald-950/70 border-2 border-emerald-500 space-y-1 text-xs text-emerald-200 uppercase flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <strong className="block text-emerald-300 font-bold">WORKSPACE CREATED SUCCESSFULLY!</strong>
                <span>Redirecting to {projectKey} workspace with live commits and collaborators...</span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={isCreating}
              className="px-4 py-2.5 border border-border text-muted-foreground hover:text-foreground text-xs uppercase font-bold transition-all disabled:opacity-50"
            >
              CANCEL
            </button>

            <button
              type="submit"
              disabled={isCreating || !repoUrl.trim()}
              className="px-6 py-2.5 bg-foreground text-background hover:bg-white font-bold text-xs uppercase flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {isCreating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-background" />
                  <span>INITIALIZING WORKSPACE...</span>
                </>
              ) : (
                <>
                  <span>CREATE & LAUNCH WORKSPACE</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

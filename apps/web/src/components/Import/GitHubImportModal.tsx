import React, { useState, useEffect } from 'react';
import {
  Github,
  DownloadCloud,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  GitPullRequest,
  Tag,
  Milestone,
  RefreshCw,
  X,
  ExternalLink,
  Zap,
  Radio
} from 'lucide-react';
import { importGitHubRepo, importFixtureRepo, fetchImportFixtures } from '../../services/api.ts';
import { useSSE } from '../../context/SSEContext.tsx';
import { useFocusTrap } from '../../hooks/useFocusTrap.ts';

interface GitHubImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete?: () => void;
}

export const GitHubImportModal: React.FC<GitHubImportModalProps> = ({
  isOpen,
  onClose,
  onImportComplete
}) => {
  const { lastEvent } = useSSE();
  const [repoUrl, setRepoUrl] = useState('https://github.com/facebook/react');
  const [maxIssues, setMaxIssues] = useState(50);
  const [githubToken, setGithubToken] = useState('');
  const [fixtures, setFixtures] = useState<any[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number; message: string; stage: string } | null>(null);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const modalRef = useFocusTrap({ isOpen, onClose });

  useEffect(() => {
    if (isOpen) {
      fetchImportFixtures()
        .then(data => setFixtures(data.fixtures || []))
        .catch(() => {});
      setProgress(null);
      setResult(null);
      setError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isImporting) return;

    if (lastEvent?.type === 'import:progress') {
      const data = lastEvent.data;
      setProgress({
        current: data.current || 0,
        total: data.total || 100,
        message: data.message || 'Ingesting repository issues...',
        stage: data.stage || 'saving'
      });
    } else if (lastEvent?.type === 'import:complete') {
      const data = lastEvent.data;
      setIsImporting(false);
      setProgress({
        current: data.total,
        total: data.total,
        message: data.message,
        stage: 'complete'
      });
      if (onImportComplete) onImportComplete();
    }
  }, [lastEvent, isImporting, onImportComplete]);

  if (!isOpen) return null;

  const handleStartImport = async (useFixture: boolean = false, fixtureName?: string) => {
    setError(null);
    setIsImporting(true);
    setResult(null);
    setProgress({ current: 0, total: 100, message: 'Connecting to repository gateway...', stage: 'fetching' });

    try {
      let res;
      if (useFixture && fixtureName) {
        res = await importFixtureRepo(fixtureName);
      } else {
        res = await importGitHubRepo({
          repoUrl: repoUrl.trim(),
          maxIssues,
          githubToken: githubToken.trim() || undefined
        });
      }
      setResult(res);
      setIsImporting(false);
      if (onImportComplete) onImportComplete();
    } catch (err: any) {
      setIsImporting(false);
      setError(err.message || 'Import failed. Please check repository URL or select an offline fixture.');
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
      aria-labelledby="import-dialog-title"
    >
      <div
        ref={modalRef}
        className="w-full max-w-2xl bg-slate-950 border border-cyan-500/30 rounded-2xl shadow-2xl overflow-hidden my-8 cyber-corners"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/95">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-cyan-400 shadow-glow-cyan">
              <Github className="w-5 h-5" />
            </div>
            <div>
              <h2 id="import-dialog-title" className="text-sm font-bold text-white tracking-wide">
                INGEST GITHUB REPOSITORY TELEMETRY
              </h2>
              <p className="text-[11px] text-slate-400 font-sans">Reconstruct issues, PR branch linkages, review bottlenecks & flow timelines</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close import dialog"
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-900 border border-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {error && (
            <div className="p-3.5 bg-red-950/80 border border-red-500/50 rounded-xl flex items-center gap-3 text-red-200 text-xs shadow-glow-red">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {/* 1-Click Offline Demo Fixtures */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/40 to-slate-950 border border-purple-500/40 space-y-3 cyber-corners">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-purple-300 text-xs font-bold uppercase tracking-wider">
                <Zap className="w-4 h-4 text-purple-400" />
                <span>Instant Offline Datasets (Zero API Rate Limits)</span>
              </div>
              <span className="text-[10px] bg-purple-950 text-purple-300 border border-purple-500/40 px-2 py-0.5 rounded-md font-mono">
                1.5s Load
              </span>
            </div>
            <p className="text-xs text-slate-400 font-sans">
              Pre-bundled real GitHub datasets with linked pull requests, review comments, and activity audit histories:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => handleStartImport(true, 'facebook/react')}
                disabled={isImporting}
                className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-purple-500/60 transition-all text-left group"
              >
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-purple-300 transition-colors flex items-center gap-1.5">
                    <span>facebook/react</span>
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  </div>
                  <div className="text-[10px] text-slate-400 font-sans mt-0.5">Concurrent mode & compiler issues + PRs</div>
                </div>
                <span className="text-[10px] text-purple-300 font-mono bg-purple-950 px-2.5 py-1 rounded-md border border-purple-800">
                  Ingest
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleStartImport(true, 'expressjs/express')}
                disabled={isImporting}
                className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-purple-500/60 transition-all text-left group"
              >
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-purple-300 transition-colors">
                    expressjs/express
                  </div>
                  <div className="text-[10px] text-slate-400 font-sans mt-0.5">Router engine & middleware pull request flow</div>
                </div>
                <span className="text-[10px] text-purple-300 font-mono bg-purple-950 px-2.5 py-1 rounded-md border border-purple-800">
                  Ingest
                </span>
              </button>
            </div>
          </div>

          {/* Live Public Repo Form */}
          <div className="space-y-4 pt-2">
            <div className="text-xs font-bold text-slate-300 uppercase tracking-widest">
              Or Ingest Any Public GitHub Repository
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Repository URL or shorthand</label>
              <input
                type="text"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/owner/repo or owner/repo"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                disabled={isImporting}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400">Max Issues to Ingest</label>
                  <span className="text-xs font-mono text-cyan-400 font-bold">{maxIssues}</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  step="10"
                  value={maxIssues}
                  onChange={(e) => setMaxIssues(Number(e.target.value))}
                  className="w-full accent-cyan-500"
                  disabled={isImporting}
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">GitHub Personal Access Token (Optional)</label>
                <input
                  type="password"
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  placeholder="ghp_•••••••••••• (avoids rate limits)"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                  disabled={isImporting}
                />
              </div>
            </div>
          </div>

          {/* Real-time Progress Bar */}
          {progress && (
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-cyan-500/30 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-cyan-300 flex items-center gap-2">
                  <RefreshCw className={`w-3.5 h-3.5 ${isImporting ? 'animate-spin' : ''}`} />
                  <span>{progress.stage === 'complete' ? 'Ingestion Complete' : 'Synchronizing Repository Data...'}</span>
                </span>
                <span className="font-mono text-slate-400 font-bold">{progressPercent}%</span>
              </div>

              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-full rounded-full transition-all duration-300 shadow-glow-neon"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <p className="text-[11px] text-slate-400 font-mono truncate">{progress.message}</p>
            </div>
          )}

          {/* Success Summary */}
          {result && (
            <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/50 space-y-2 text-xs text-emerald-200 shadow-glow-neon">
              <div className="flex items-center gap-2 font-bold text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Successfully Ingested {result.total_issues || result.imported_count} Issues from {result.repo_name}!</span>
              </div>
              <p className="text-[11px] text-emerald-300/80 font-sans">
                All issues, PR branch associations, review history, and labels are now fully integrated into the Incident Matrix, Flow Timeline, and Analytics CFD.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-mono border border-slate-800 transition-colors"
            >
              {result ? 'Done' : 'Cancel'}
            </button>
            {!result && (
              <button
                type="button"
                onClick={() => handleStartImport(false)}
                disabled={isImporting || !repoUrl.trim()}
                className="cyber-btn-primary !px-5 !py-2 text-xs font-bold"
              >
                <DownloadCloud className="w-4 h-4" />
                <span>{isImporting ? 'Ingesting...' : 'Start Repository Ingest'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

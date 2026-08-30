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
        .catch(() => { });
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
    setProgress({ current: 0, total: 100, message: 'CONNECTING TO REPOSITORY GATEWAY...', stage: 'fetching' });

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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto font-mono"
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-dialog-title"
    >
      <div
        ref={modalRef}
        className="w-full max-w-2xl bg-[#080808] border-2 border-foreground shadow-brutalist overflow-hidden my-8 text-foreground"
      >
        {/* Brutalist Window Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-[#121212] border-b-2 border-foreground text-[10px]">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 bg-[#B497CF]" />
            <span className="h-2 w-2 bg-foreground" />
            <span className="font-bold uppercase tracking-wider">// INGEST // GITHUB_TELEMETRY</span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close import dialog"
            className="p-1 border border-border hover:border-foreground text-muted-foreground hover:text-foreground bg-[#080808]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-950 border-2 border-red-500 flex items-center gap-2 text-red-200 text-xs font-mono uppercase">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {/* 1-Click Offline Demo Fixtures */}
          <div className="p-4 bg-[#0d0d0d] border-2 border-[#B497CF] space-y-3 shadow-brutalist">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#B497CF] text-xs font-bold uppercase tracking-wider">
                <Zap className="w-4 h-4" />
                <span>// OFFLINE BENCHMARK DATASETS (RATE-LIMIT FREE)</span>
              </div>
              <span className="text-[9px] bg-[#B497CF] text-background px-1.5 py-0.2 font-mono font-bold uppercase">
                &lt; 1.5S LOAD
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground uppercase font-mono">
              PRE-BUNDLED REAL GITHUB DATASETS WITH LINKED PRS, REVIEWS, AND AUDIT EVENTS:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => handleStartImport(true, 'facebook/react')}
                disabled={isImporting}
                className="p-3 bg-black border-2 border-border hover:border-foreground flex items-center justify-between text-left transition-all"
              >
                <div>
                  <div className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase">
                    <span>facebook/react</span>
                  </div>
                  <div className="text-[9px] text-muted-foreground uppercase mt-0.5">COMPILER & CONCURRENT ISSUES + PRS</div>
                </div>
                <span className="px-2 py-0.5 bg-foreground text-background text-[9px] font-bold uppercase">
                  INGEST
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleStartImport(true, 'expressjs/express')}
                disabled={isImporting}
                className="p-3 bg-black border-2 border-border hover:border-foreground flex items-center justify-between text-left transition-all"
              >
                <div>
                  <div className="text-xs font-bold text-foreground uppercase">
                    expressjs/express
                  </div>
                  <div className="text-[9px] text-muted-foreground uppercase mt-0.5">ROUTER & MIDDLEWARE PRS</div>
                </div>
                <span className="px-2 py-0.5 bg-foreground text-background text-[9px] font-bold uppercase">
                  INGEST
                </span>
              </button>
            </div>
          </div>

          {/* Live Public Repo Form */}
          <div className="space-y-3 pt-1">
            <div className="text-xs font-bold text-foreground uppercase tracking-widest">
              // OR INGEST ANY PUBLIC REPOSITORY
            </div>

            <div>
              <label className="block text-[9px] uppercase font-bold text-muted-foreground mb-1">REPOSITORY URL</label>
              <input
                type="text"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/owner/repo"
                className="w-full bg-[#0d0d0d] border-2 border-border p-2 text-xs text-foreground focus:outline-none focus:border-foreground font-mono"
                disabled={isImporting}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[9px] uppercase font-bold text-muted-foreground">MAX ISSUES</label>
                  <span className="text-xs font-mono text-foreground font-bold">{maxIssues}</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  step="10"
                  value={maxIssues}
                  onChange={(e) => setMaxIssues(Number(e.target.value))}
                  className="w-full accent-[#B497CF]"
                  disabled={isImporting}
                />
              </div>

              <div>
                <label className="block text-[9px] uppercase font-bold text-muted-foreground mb-1">PERSONAL ACCESS TOKEN (OPTIONAL)</label>
                <input
                  type="password"
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  placeholder="ghp_••••••••••••"
                  className="w-full bg-[#0d0d0d] border-2 border-border p-1.5 text-xs text-foreground focus:outline-none focus:border-foreground font-mono"
                  disabled={isImporting}
                />
              </div>
            </div>
          </div>

          {/* Real-time Progress Bar */}
          {progress && (
            <div className="p-3 bg-[#0d0d0d] border-2 border-foreground space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-foreground flex items-center gap-1.5 uppercase">
                  <RefreshCw className={`w-3.5 h-3.5 ${isImporting ? 'animate-spin' : ''}`} />
                  <span>{progress.stage === 'complete' ? 'INGESTION COMPLETE' : 'SYNCHRONIZING TELEMETRY...'}</span>
                </span>
                <span className="font-mono text-foreground font-bold">{progressPercent}%</span>
              </div>

              <div className="w-full bg-black border border-border h-2 overflow-hidden">
                <div
                  className="bg-[#B497CF] h-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <p className="text-[10px] text-muted-foreground font-mono truncate uppercase">{progress.message}</p>
            </div>
          )}

          {/* Success Summary */}
          {result && (
            <div className="p-3 bg-emerald-950 border-2 border-emerald-500 space-y-1.5 text-xs text-emerald-200 uppercase">
              <div className="flex items-center gap-1.5 font-bold text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>INGESTED {result.total_issues || result.imported_count} ISSUES FROM {result.repo_name}!</span>
              </div>
              <p className="text-[10px] text-emerald-300 font-mono">
                INTEGRATED INTO INCIDENT MATRIX, TIMELINE, AND ANALYTICS CFD.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t-2 border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 border-2 border-border text-muted-foreground hover:text-foreground text-xs uppercase font-bold"
            >
              {result ? 'DONE' : 'CANCEL'}
            </button>
            {!result && (
              <button
                type="button"
                onClick={() => handleStartImport(false)}
                disabled={isImporting || !repoUrl.trim()}
                className="brutalist-btn disabled:opacity-50"
              >
                <span className="btn-icon-block">
                  <DownloadCloud className="w-3.5 h-3.5" />
                </span>
                <span className="btn-text-block">
                  {isImporting ? 'INGESTING...' : 'START INGEST'}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

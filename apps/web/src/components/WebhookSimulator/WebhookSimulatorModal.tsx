import React, { useState } from 'react';
import {
  X,
  GitPullRequest,
  GitCommit,
  CheckCircle2,
  Play,
  Loader2,
  Terminal,
  Bot,
  Radio,
  Sparkles
} from 'lucide-react';
import { simulateWebhook } from '../../services/api.ts';
import { useFocusTrap } from '../../hooks/useFocusTrap.ts';

interface WebhookSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectBug: (bugId: number) => void;
}

export const WebhookSimulatorModal: React.FC<WebhookSimulatorModalProps> = ({
  isOpen,
  onClose,
  onSelectBug
}) => {
  const trapRef = useFocusTrap<HTMLDivElement>({
    isOpen,
    onClose
  });
  const [bugId, setBugId] = useState<number>(412);
  const [simType, setSimType] = useState<'commit' | 'pr_open' | 'pr_review' | 'pr_merge'>('commit');
  const [message, setMessage] = useState('Fixes #412: resolve offline save crash with fallback queue');
  const [author, setAuthor] = useState('alex');
  const [isExecuting, setIsExecuting] = useState(false);
  const [resultLog, setResultLog] = useState<any | null>(null);

  if (!isOpen) return null;

  const handleSimulate = async (typeOverride?: 'commit' | 'pr_open' | 'pr_review' | 'pr_merge', msgOverride?: string) => {
    const typeToRun = typeOverride || simType;
    const msgToRun = msgOverride || message;

    setIsExecuting(true);
    setResultLog(null);

    try {
      const res = await simulateWebhook({
        type: typeToRun,
        bugId,
        message: msgToRun,
        author,
        prNumber: 89,
        branchName: 'fix/offline-save-crash'
      });

      setResultLog(res);
    } catch (err: any) {
      setResultLog({ error: err.message || 'Webhook simulation failed' });
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto animate-fade-in font-mono"
      onClick={onClose}
    >
      <div
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="webhook-sim-title"
        className="w-full max-w-2xl bg-slate-950 border border-cyan-500/30 rounded-2xl shadow-2xl overflow-hidden my-6 animate-slide-up flex flex-col cyber-corners"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header HUD */}
        <div className="p-5 border-b border-slate-800 bg-slate-950/95 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-cyan-950/80 border border-cyan-500/50 flex items-center justify-center text-cyan-300 shadow-glow-cyan">
              <GitPullRequest className="w-4 h-4" />
            </div>
            <div>
              <h2 id="webhook-sim-title" className="text-sm font-bold text-white flex items-center gap-2">
                <span>GITHUB WEBHOOK & EVENT TELEMETRY REPLAYER</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  automated: true
                </span>
              </h2>
              <p className="text-[11px] text-slate-400 font-sans">
                Simulate inbound signed GitHub webhook events and watch the state machine auto-transition live
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 rounded-xl text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Quick Demo Preset Buttons */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2.5">
              ONE-CLICK WEBHOOK TELEMETRY PRESETS:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                onClick={() => {
                  setBugId(412);
                  setSimType('commit');
                  setMessage('Fixes #412: resolve offline save crash with fallback queue');
                  handleSimulate('commit', 'Fixes #412: resolve offline save crash with fallback queue');
                }}
                disabled={isExecuting}
                className="p-3.5 rounded-xl bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/50 text-left transition-all group"
              >
                <div className="flex items-center gap-2 font-bold text-xs text-emerald-300 group-hover:text-emerald-200">
                  <GitCommit className="w-3.5 h-3.5" />
                  <span>Push 'Fixes #412' Commit</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1 font-sans">
                  Auto-transitions Bug #412 to Resolved with automated: true in audit log
                </p>
              </button>

              <button
                onClick={() => {
                  setBugId(412);
                  setSimType('pr_review');
                  setMessage('Approve PR #89');
                  handleSimulate('pr_review', 'Approve PR #89');
                }}
                disabled={isExecuting}
                className="p-3.5 rounded-xl bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-purple-500/50 text-left transition-all group"
              >
                <div className="flex items-center gap-2 font-bold text-xs text-purple-300 group-hover:text-purple-200">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Approve PR #89 Review</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1 font-sans">
                  Automatically grants open review? flag on Bug #412
                </p>
              </button>

              <button
                onClick={() => {
                  setBugId(412);
                  setSimType('pr_open');
                  setMessage('Fix crash during offline save (refs #412)');
                  handleSimulate('pr_open', 'Fix crash during offline save (refs #412)');
                }}
                disabled={isExecuting}
                className="p-3.5 rounded-xl bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-cyan-500/50 text-left transition-all group"
              >
                <div className="flex items-center gap-2 font-bold text-xs text-cyan-300 group-hover:text-cyan-200">
                  <GitPullRequest className="w-3.5 h-3.5" />
                  <span>Open PR for #412</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1 font-sans">
                  Moves bug from In Progress to In Review
                </p>
              </button>

              <button
                onClick={() => {
                  setBugId(412);
                  setSimType('pr_merge');
                  setMessage('Merge pull request #89');
                  handleSimulate('pr_merge', 'Merge pull request #89');
                }}
                disabled={isExecuting}
                className="p-3.5 rounded-xl bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-amber-500/50 text-left transition-all group"
              >
                <div className="flex items-center gap-2 font-bold text-xs text-amber-300 group-hover:text-amber-200">
                  <Bot className="w-3.5 h-3.5" />
                  <span>Merge PR #89</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1 font-sans">
                  Closes out PR and moves state to Resolved
                </p>
              </button>
            </div>
          </div>

          {/* Execution Log */}
          {resultLog && (
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 font-mono text-xs animate-slide-up cyber-corners">
              <div className="flex items-center justify-between text-slate-400 pb-1.5 border-b border-slate-800">
                <span className="flex items-center gap-1.5 text-white font-bold">
                  <Terminal className="w-3.5 h-3.5 text-cyan-400" /> Result Telemetry Log:
                </span>
                <button
                  onClick={() => {
                    onClose();
                    onSelectBug(bugId);
                  }}
                  className="text-cyan-400 hover:underline flex items-center gap-1 text-[11px]"
                >
                  <span>Open Incident #{bugId} in Dossier</span>
                </button>
              </div>

              <pre className="text-[11px] text-cyan-300/90 overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(resultLog, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

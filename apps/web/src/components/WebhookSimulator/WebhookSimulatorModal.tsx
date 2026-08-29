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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in font-mono"
      onClick={onClose}
    >
      <div
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="webhook-sim-title"
        className="w-full max-w-2xl bg-[#080808] border-2 border-foreground shadow-brutalist overflow-hidden my-6 animate-slide-up flex flex-col text-foreground"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Brutalist Header */}
        <div className="p-3 border-b-2 border-foreground bg-[#121212] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 bg-[#ea580c]" />
            <span className="h-2 w-2 bg-foreground" />
            <div>
              <h2 id="webhook-sim-title" className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                <span>// REPLAY // GITHUB_WEBHOOK_EVENT</span>
                <span className="text-[9px] px-1.5 py-0.2 bg-[#ea580c] text-background font-bold uppercase">
                  AUTOMATED: TRUE
                </span>
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1 border border-border hover:border-foreground text-muted-foreground hover:text-foreground bg-[#080808]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Quick Demo Preset Buttons */}
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
              // ONE-CLICK WEBHOOK TELEMETRY PRESETS:
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
                className="p-3 bg-[#0d0d0d] border-2 border-border hover:border-foreground text-left transition-all group"
              >
                <div className="flex items-center gap-1.5 font-bold text-xs text-foreground uppercase">
                  <GitCommit className="w-3.5 h-3.5 text-[#ea580c]" />
                  <span>PUSH 'FIXES #412' COMMIT</span>
                </div>
                <p className="text-[9px] text-muted-foreground mt-1 uppercase font-mono">
                  AUTO-TRANSITIONS BUG #412 TO RESOLVED WITH AUTOMATED: TRUE
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
                className="p-3 bg-[#0d0d0d] border-2 border-border hover:border-foreground text-left transition-all group"
              >
                <div className="flex items-center gap-1.5 font-bold text-xs text-foreground uppercase">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>APPROVE PR #89 REVIEW</span>
                </div>
                <p className="text-[9px] text-muted-foreground mt-1 uppercase font-mono">
                  GRANTS PENDING REVIEW? FLAG ON BUG #412
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
                className="p-3 bg-[#0d0d0d] border-2 border-border hover:border-foreground text-left transition-all group"
              >
                <div className="flex items-center gap-1.5 font-bold text-xs text-foreground uppercase">
                  <GitPullRequest className="w-3.5 h-3.5 text-[#ea580c]" />
                  <span>OPEN PR FOR #412</span>
                </div>
                <p className="text-[9px] text-muted-foreground mt-1 uppercase font-mono">
                  MOVES BUG FROM IN PROGRESS TO IN REVIEW
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
                className="p-3 bg-[#0d0d0d] border-2 border-border hover:border-foreground text-left transition-all group"
              >
                <div className="flex items-center gap-1.5 font-bold text-xs text-foreground uppercase">
                  <Bot className="w-3.5 h-3.5 text-foreground" />
                  <span>MERGE PR #89</span>
                </div>
                <p className="text-[9px] text-muted-foreground mt-1 uppercase font-mono">
                  CLOSES OUT PR AND MOVES STATE TO RESOLVED
                </p>
              </button>
            </div>
          </div>

          {/* Execution Log */}
          {resultLog && (
            <div className="p-3 bg-black border-2 border-border space-y-2 font-mono text-xs animate-slide-up">
              <div className="flex items-center justify-between text-muted-foreground pb-1 border-b border-border">
                <span className="flex items-center gap-1.5 text-foreground font-bold uppercase">
                  <Terminal className="w-3.5 h-3.5 text-[#ea580c]" /> RESULT LOG:
                </span>
                <button
                  onClick={() => {
                    onClose();
                    onSelectBug(bugId);
                  }}
                  className="text-[#ea580c] hover:underline flex items-center gap-1 text-[10px] uppercase font-bold"
                >
                  <span>OPEN INCIDENT #{bugId} DOSSIER</span>
                </button>
              </div>

              <pre className="text-[10px] text-foreground overflow-x-auto whitespace-pre-wrap font-mono">
                {JSON.stringify(resultLog, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

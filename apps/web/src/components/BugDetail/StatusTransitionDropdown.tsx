import React, { useState } from 'react';
import { BugStatus, WorkflowTransition } from '@triarc/shared-types';
import { ChevronDown, ArrowRight, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { transitionBug } from '../../services/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';

interface StatusTransitionDropdownProps {
  bugId: number;
  currentStatus: BugStatus;
  availableTransitions: WorkflowTransition[];
  onTransitionSuccess: () => void;
}

export const StatusTransitionDropdown: React.FC<StatusTransitionDropdownProps> = ({
  bugId,
  currentStatus,
  availableTransitions,
  onTransitionSuccess
}) => {
  const { currentUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<WorkflowTransition | null>(null);
  const [comment, setComment] = useState('');
  const [resolution, setResolution] = useState('FIXED');
  const [duplicateOf, setDuplicateOf] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Unconfirmed': return 'bg-slate-700 text-slate-200 border-slate-600';
      case 'Confirmed': return 'bg-sky-500/20 text-sky-300 border-sky-500/40';
      case 'In Progress': return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'In Review': return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      case 'Resolved': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'Verified': return 'bg-teal-500/20 text-teal-300 border-teal-500/40';
      case 'Closed': return 'bg-slate-800 text-slate-400 border-slate-700';
      case 'Duplicate': return 'bg-zinc-800 text-zinc-300 border-zinc-700';
      default: return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const handleSelectTransition = (t: WorkflowTransition) => {
    setErrorMsg(null);
    setSelectedTarget(t);
    setComment('');
    setIsOpen(false);
  };

  const handleExecuteTransition = async () => {
    if (!selectedTarget) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    const fields: Record<string, any> = {};
    if (selectedTarget.to === 'Resolved') {
      fields.resolution = resolution;
    }
    if (selectedTarget.to === 'Duplicate') {
      fields.duplicate_of = Number(duplicateOf);
    }

    try {
      await transitionBug(
        bugId,
        {
          toState: selectedTarget.to,
          comment: comment.trim() || undefined,
          fields
        },
        currentUser?.id
      );

      setSelectedTarget(null);
      onTransitionSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || 'Transition rejected');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-400 font-medium">Status:</span>

        {/* Current status button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`px-3 py-1 rounded-lg text-xs font-semibold border flex items-center gap-1.5 shadow-sm transition-all hover:scale-105 active:scale-95 ${getStatusColor(
            currentStatus
          )}`}
        >
          <span>{currentStatus}</span>
          <ChevronDown className="w-3.5 h-3.5 opacity-75" />
        </button>
      </div>

      {/* Dropdown of valid transitions computed by engine */}
      {isOpen && (
        <div className="absolute left-0 mt-2 w-56 rounded-xl bg-surface-100 border border-slate-700 shadow-2xl p-2 z-50 animate-slide-up">
          <div className="px-2 py-1.5 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Engine Transitions for @{currentUser?.role || 'dev'}
          </div>

          <div className="space-y-1 mt-1">
            {availableTransitions.map((t, idx) => (
              <button
                key={idx}
                onClick={() => handleSelectTransition(t)}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-slate-200 hover:bg-surface-200 hover:text-white transition-all text-left group"
              >
                <div className="flex items-center gap-2">
                  <ArrowRight className="w-3.5 h-3.5 text-primary-400 group-hover:translate-x-0.5 transition-transform" />
                  <span className="font-semibold">{t.to}</span>
                </div>
                {t.guards && (
                  <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1 py-0.2 rounded border border-amber-500/20">
                    Guarded
                  </span>
                )}
              </button>
            ))}

            {availableTransitions.length === 0 && (
              <div className="p-3 text-center text-[11px] text-slate-500 italic">
                No next transitions permitted for role '{currentUser?.role || 'user'}'
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal / Dialog when transition requires guard input */}
      {selectedTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md bg-surface-100 border border-slate-700 rounded-2xl shadow-2xl p-5 animate-slide-up space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Transition Bug #{bugId} to</span>
                <span className={`px-2 py-0.5 rounded text-xs border ${getStatusColor(selectedTarget.to)}`}>
                  {selectedTarget.to}
                </span>
              </h3>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Resolution selector for Resolved */}
            {selectedTarget.to === 'Resolved' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Resolution Reason:</label>
                <select
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  className="w-full bg-surface-50 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary-500"
                >
                  <option value="FIXED">FIXED</option>
                  <option value="WORKSFORME">WORKSFORME</option>
                  <option value="INVALID">INVALID</option>
                  <option value="NOTABUG">NOTABUG</option>
                </select>
              </div>
            )}

            {/* Duplicate ID input for Duplicate */}
            {selectedTarget.to === 'Duplicate' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Duplicate of Bug ID:</label>
                <input
                  type="number"
                  placeholder="e.g. 102"
                  value={duplicateOf}
                  onChange={(e) => setDuplicateOf(e.target.value)}
                  className="w-full bg-surface-50 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary-500"
                />
              </div>
            )}

            {/* Comment field (Guarded if requireComment is true) */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Comment {selectedTarget.guards?.requireComment ? '(Required by workflow guard)' : '(Optional)'}:
              </label>
              <textarea
                rows={3}
                placeholder="Explain the reason for this transition..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full bg-surface-50 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-primary-500"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
              <button
                onClick={() => setSelectedTarget(null)}
                className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteTransition}
                disabled={isSubmitting}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-primary-600 hover:bg-primary-500 shadow-glow-primary flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                <span>Confirm Transition</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

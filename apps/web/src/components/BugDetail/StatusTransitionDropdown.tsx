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
      case 'Unconfirmed': return 'bg-[#141414] text-muted-foreground border-border';
      case 'Confirmed': return 'bg-[#ea580c]/20 text-[#ea580c] border-[#ea580c]';
      case 'In Progress': return 'bg-amber-950 text-amber-300 border-amber-500';
      case 'In Review': return 'bg-[#ea580c] text-background border-[#ea580c] font-bold';
      case 'Resolved': return 'bg-emerald-950 text-emerald-300 border-emerald-500 font-bold';
      case 'Verified': return 'bg-foreground text-background border-foreground font-bold';
      case 'Closed': return 'bg-black text-muted-foreground border-border';
      case 'Duplicate': return 'bg-[#1a1a1a] text-muted-foreground border-border';
      default: return 'bg-black text-foreground border-border';
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
    <div className="relative font-mono">
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-muted-foreground font-bold uppercase">STATUS:</span>

        {/* Current status button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`px-2.5 py-0.5 text-xs font-bold uppercase border-2 flex items-center gap-1 shadow-brutalist transition-all ${getStatusColor(
            currentStatus
          )}`}
        >
          <span>{currentStatus}</span>
          <ChevronDown className="w-3 h-3" />
        </button>
      </div>

      {/* Dropdown of valid transitions */}
      {isOpen && (
        <div className="absolute left-0 mt-1 w-64 bg-[#080808] border-2 border-foreground shadow-brutalist p-1.5 z-50 animate-slide-up">
          <div className="px-2 py-1 border-b border-border text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
            // TRANSITIONS FOR @{currentUser?.role?.toUpperCase() || 'DEV'}
          </div>

          <div className="space-y-0.5 mt-1">
            {availableTransitions.map((t, idx) => (
              <button
                key={idx}
                onClick={() => handleSelectTransition(t)}
                className="w-full flex items-center justify-between px-2 py-1 text-xs text-foreground hover:bg-foreground hover:text-background uppercase transition-all text-left group"
              >
                <div className="flex items-center gap-1.5 font-bold">
                  <span>→</span>
                  <span>{t.to}</span>
                </div>
                {t.guards && (
                  <span className="text-[9px] text-[#ea580c] bg-black px-1 py-0.2 border border-[#ea580c]">
                    GUARDED
                  </span>
                )}
              </button>
            ))}

            {availableTransitions.length === 0 && (
              <div className="p-2 text-center text-[10px] text-muted-foreground uppercase">
                // ZERO NEXT TRANSITIONS PERMITTED
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal / Dialog when transition requires guard input */}
      {selectedTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md bg-[#080808] border-2 border-foreground shadow-brutalist p-5 animate-slide-up space-y-3 font-mono text-xs text-foreground">
            <div className="flex items-center justify-between border-b-2 border-border pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                <span>TRANSITION #{bugId} →</span>
                <span className={`px-1.5 py-0.2 border ${getStatusColor(selectedTarget.to)}`}>
                  {selectedTarget.to}
                </span>
              </h3>
            </div>

            {errorMsg && (
              <div className="p-2 bg-red-950 border border-red-500 text-red-200 text-[10px] uppercase flex items-start gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Resolution selector for Resolved */}
            {selectedTarget.to === 'Resolved' && (
              <div>
                <label className="block text-[9px] uppercase font-bold text-muted-foreground mb-1">RESOLUTION REASON:</label>
                <select
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  className="w-full bg-black border-2 border-border p-1.5 text-xs text-foreground uppercase focus:outline-none focus:border-foreground font-mono"
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
                <label className="block text-[9px] uppercase font-bold text-muted-foreground mb-1">DUPLICATE OF BUG ID:</label>
                <input
                  type="number"
                  placeholder="e.g. 102"
                  value={duplicateOf}
                  onChange={(e) => setDuplicateOf(e.target.value)}
                  className="w-full bg-black border-2 border-border p-1.5 text-xs text-foreground uppercase focus:outline-none focus:border-foreground font-mono"
                />
              </div>
            )}

            {/* Comment field */}
            <div>
              <label className="block text-[9px] uppercase font-bold text-muted-foreground mb-1">
                AUDIT NOTE {selectedTarget.guards?.requireComment ? '(REQUIRED BY WORKFLOW GUARD)' : '(OPTIONAL)'}:
              </label>
              <textarea
                rows={3}
                placeholder="EXPLAIN THE REASON FOR THIS TRANSITION..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full bg-black border-2 border-border p-2 text-xs text-foreground uppercase focus:outline-none focus:border-foreground font-mono"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <button
                onClick={() => setSelectedTarget(null)}
                className="px-3 py-1 border-2 border-border text-muted-foreground hover:text-foreground text-xs uppercase font-bold"
              >
                CANCEL
              </button>
              <button
                onClick={handleExecuteTransition}
                disabled={isSubmitting}
                className="px-3 py-1 bg-foreground text-background font-bold text-xs uppercase hover:bg-white flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                <span>CONFIRM TRANSITION</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

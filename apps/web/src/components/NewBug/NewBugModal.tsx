import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Radar,
  AlertTriangle,
  ArrowRight,
  Shield,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { createBug, checkDuplicates } from '../../services/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { DuplicateMatch, BugSeverity, BugPriority } from '@triarc/shared-types';

interface NewBugModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBugCreated: (bugId: number) => void;
  onSelectBug: (bugId: number) => void;
}

export const NewBugModal: React.FC<NewBugModalProps> = ({
  isOpen,
  onClose,
  onBugCreated,
  onSelectBug
}) => {
  const { currentUser, users } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [componentId, setComponentId] = useState('core');
  const [severity, setSeverity] = useState<BugSeverity>('normal');
  const [priority, setPriority] = useState<BugPriority>('normal');
  const [assigneeId, setAssigneeId] = useState('');
  const [isConfidential, setIsConfidential] = useState(false);

  const [duplicates, setDuplicates] = useState<DuplicateMatch[]>([]);
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Debounced Duplicate Radar (300ms)
  useEffect(() => {
    if (!title || title.trim().length < 4) {
      setDuplicates([]);
      return;
    }

    setIsCheckingDuplicates(true);
    const timer = setTimeout(() => {
      checkDuplicates(title, description, undefined, currentUser?.id)
        .then((matches) => {
          setDuplicates(matches);
        })
        .catch(() => {
          setDuplicates([]);
        })
        .finally(() => {
          setIsCheckingDuplicates(false);
        });
    }, 300);

    return () => clearTimeout(timer);
  }, [title, description, currentUser?.id]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setErrorMsg('Title and description are required');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await createBug(
        {
          title: title.trim(),
          description: description.trim(),
          component_id: componentId,
          severity,
          priority,
          assignee_id: assigneeId || null,
          security_group_id: isConfidential ? 'grp_sec' : null
        },
        currentUser?.id
      );

      onClose();
      onBugCreated(res.id);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to file bug');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in" onClick={onClose}>
      <div
        className="w-full max-w-3xl bg-surface-50 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden my-6 animate-slide-up flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-surface-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary-600/30 border border-primary-500/40 flex items-center justify-center text-primary-300">
              <Plus className="w-4 h-4 stroke-[3]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">File a New Bug Report</h2>
              <p className="text-[11px] text-slate-400">Creates a structured, auditable report with Live Duplicate Radar</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Summary / Title <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Crash on save when offline (NPE in SyncEngine)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-surface-100 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 transition-all shadow-inner"
            />
          </div>

          {/* Headline #3: Live Duplicate Radar Card */}
          {(duplicates.length > 0 || isCheckingDuplicates) && (
            <div className="p-4 rounded-xl bg-surface-100/90 border border-amber-500/30 shadow-lg space-y-2.5 animate-slide-up">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Radar className={`w-4 h-4 text-amber-400 ${isCheckingDuplicates ? 'animate-spin' : 'animate-pulse'}`} />
                  <span className="text-xs font-bold text-amber-300">
                    Live Duplicate Radar — Similar Issues Found ({duplicates.length})
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">Semantic Vector Cosine Match</span>
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {duplicates.map((dup) => {
                  const matchPct = Math.round(dup.similarity_score * 100);
                  const isHighMatch = matchPct >= 70;

                  return (
                    <div
                      key={dup.bug_id}
                      className="p-2.5 rounded-lg bg-surface-200/80 border border-slate-700 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border ${
                          isHighMatch ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        }`}>
                          {matchPct}% match
                        </span>
                        <span className="font-mono text-primary-400 font-bold shrink-0">#{dup.bug_id}</span>
                        <span className="text-slate-200 font-medium truncate">{dup.title}</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onSelectBug(dup.bug_id);
                        }}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 flex items-center gap-1 shrink-0 transition-all"
                      >
                        <span>View Existing</span>
                        <ArrowRight className="w-3 h-3 text-slate-500" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Description & Reproduction Steps <span className="text-rose-400">*</span>
            </label>
            <textarea
              required
              rows={4}
              placeholder="What happened? What were the expected results? Attach logs or steps to reproduce..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-surface-100 border border-slate-700/80 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 transition-all shadow-inner"
            />
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Component:</label>
              <select
                value={componentId}
                onChange={(e) => setComponentId(e.target.value)}
                className="w-full bg-surface-100 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-primary-500"
              >
                <option value="core">Core Engine</option>
                <option value="auth">Auth & Security</option>
                <option value="ui">Web Client</option>
                <option value="api">REST & SSE Gateway</option>
                <option value="db">Storage & Persistence</option>
                <option value="git">GitHub Integration</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Severity:</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as BugSeverity)}
                className="w-full bg-surface-100 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-primary-500"
              >
                <option value="blocker">Blocker</option>
                <option value="critical">Critical</option>
                <option value="major">Major</option>
                <option value="normal">Normal</option>
                <option value="minor">Minor</option>
                <option value="trivial">Trivial</option>
                <option value="enhancement">Enhancement</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Priority:</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as BugPriority)}
                className="w-full bg-surface-100 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-primary-500"
              >
                <option value="highest">P0 (Highest)</option>
                <option value="high">P1 (High)</option>
                <option value="normal">P2 (Normal)</option>
                <option value="low">P3 (Low)</option>
                <option value="lowest">P4 (Lowest)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Assignee:</label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full bg-surface-100 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-primary-500"
              >
                <option value="">Unassigned</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} (@{u.username})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Security Group Toggle */}
          <div className="pt-2">
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer p-2.5 rounded-lg bg-surface-100 border border-slate-800 hover:border-slate-700 transition-all">
              <input
                type="checkbox"
                checked={isConfidential}
                onChange={(e) => setIsConfidential(e.target.checked)}
                className="rounded bg-slate-900 border-slate-700 text-red-500 focus:ring-0"
              />
              <Shield className="w-3.5 h-3.5 text-red-400" />
              <span>Mark as Confidential Security Bug (Restrict visibility to Security Core Team)</span>
            </label>
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-slate-400 hover:text-white bg-surface-100 hover:bg-surface-200 border border-slate-700 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 rounded-lg shadow-glow-primary flex items-center gap-2 disabled:opacity-50 transition-all transform active:scale-95"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              <span>File Bug Report</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

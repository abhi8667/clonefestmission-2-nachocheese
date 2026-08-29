import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Radar,
  AlertTriangle,
  ArrowRight,
  Shield,
  Loader2,
  CheckCircle2,
  Tag,
  Clock,
  Milestone as MilestoneIcon,
  ShieldAlert,
  Radio,
  FileCode
} from 'lucide-react';
import { createBug, checkDuplicates, fetchMilestones, fetchVersions, fetchKeywords } from '../../services/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { DuplicateMatch, BugSeverity, BugPriority } from '@triarc/shared-types';
import { useFocusTrap } from '../../hooks/useFocusTrap.ts';

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
  const trapRef = useFocusTrap<HTMLDivElement>({
    isOpen,
    onClose
  });
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [componentId, setComponentId] = useState('core');
  const [severity, setSeverity] = useState<BugSeverity>('normal');
  const [priority, setPriority] = useState<BugPriority>('normal');
  const [assigneeId, setAssigneeId] = useState('');
  const [targetMilestone, setTargetMilestone] = useState('');
  const [version, setVersion] = useState('');
  const [estimatedTime, setEstimatedTime] = useState('');
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [isConfidential, setIsConfidential] = useState(false);

  const [milestones, setMilestones] = useState<any[]>([]);
  const [versions, setVersions] = useState<any[]>([]);
  const [keywords, setKeywords] = useState<any[]>([]);

  const [duplicates, setDuplicates] = useState<DuplicateMatch[]>([]);
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchMilestones().then((r) => setMilestones(r.milestones || [])).catch(() => {});
      fetchVersions().then((r) => setVersions(r.versions || [])).catch(() => {});
      fetchKeywords().then((r) => setKeywords(r.keywords || [])).catch(() => {});
    }
  }, [isOpen]);

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

  const toggleKeyword = (kwId: string) => {
    if (selectedKeywords.includes(kwId)) {
      setSelectedKeywords(selectedKeywords.filter((k) => k !== kwId));
    } else {
      setSelectedKeywords([...selectedKeywords, kwId]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setErrorMsg('Please provide a summary and reproduction details');
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
          security_group_id: isConfidential ? 'grp_sec' : null,
          target_milestone: targetMilestone || null,
          version: version || null,
          estimated_time: estimatedTime ? parseFloat(estimatedTime) : 0,
          keyword_ids: selectedKeywords
        },
        currentUser?.id
      );

      onClose();
      onBugCreated(res.id);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to file incident report');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto animate-fade-in"
      onClick={onClose}
    >
      <div
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-bug-modal-title"
        className="w-full max-w-3xl bg-slate-950 border border-cyan-500/30 rounded-2xl shadow-2xl overflow-hidden my-6 animate-slide-up flex flex-col max-h-[92vh] cyber-corners"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header HUD */}
        <div className="p-5 border-b border-slate-800 bg-slate-950/95 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-cyan-950/80 border border-cyan-500/50 flex items-center justify-center text-cyan-300 shadow-glow-cyan">
              <Plus className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 id="new-bug-modal-title" className="text-base font-bold font-mono text-white">
                FILE SECURITY INCIDENT / DEFECT REPORT
              </h2>
              <p className="text-[11px] font-mono text-slate-400">
                Auditable telemetry intake with live AI duplicate radar
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-950/80 border border-red-500/50 text-red-300 text-xs font-mono flex items-center gap-2 shadow-glow-red">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Title */}
          <div>
            <label htmlFor="new-bug-title" className="block text-xs font-mono font-bold text-slate-300 mb-1.5">
              SUMMARY / INCIDENT TITLE <span className="text-red-400">*</span>
            </label>
            <input
              id="new-bug-title"
              type="text"
              required
              placeholder="e.g. Memory corruption during parallel TLS handshake in AuthEngine"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-all shadow-inner"
            />
          </div>

          {/* Duplicate Radar Card */}
          {(duplicates.length > 0 || isCheckingDuplicates) && (
            <div
              role="region"
              aria-live="polite"
              aria-label="Duplicate radar suggestions"
              className="p-4 rounded-xl bg-slate-900/90 border border-amber-500/40 shadow-glow-amber space-y-3 animate-slide-up cyber-corners"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Radar className={`w-4 h-4 text-amber-400 ${isCheckingDuplicates ? 'animate-spin' : 'animate-pulse'}`} />
                  <span className="text-xs font-bold font-mono text-amber-300">
                    LIVE RADAR MATCHES FOUND ({duplicates.length})
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">Semantic Vector Cosine Telemetry</span>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-0.5">
                {duplicates.map((dup) => {
                  const matchPct = Math.round(dup.similarity_score * 100);
                  const isHighMatch = matchPct >= 70;

                  return (
                    <div
                      key={dup.bug_id}
                      className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border ${
                            isHighMatch
                              ? 'bg-red-950 text-red-300 border-red-500/50 shadow-glow-red'
                              : 'bg-amber-950 text-amber-300 border-amber-500/50'
                          }`}
                        >
                          {matchPct}% match
                        </span>
                        <span className="font-mono text-cyan-400 font-bold shrink-0">#{dup.bug_id}</span>
                        <span className="text-slate-200 font-medium truncate">{dup.title}</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onSelectBug(dup.bug_id);
                        }}
                        className="px-3 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-[11px] font-mono text-cyan-300 border border-slate-700 flex items-center gap-1 shrink-0 transition-all"
                      >
                        <span>View</span>
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
            <label className="block text-xs font-mono font-bold text-slate-300 mb-1.5">
              REPRODUCTION STEPS & LOGS <span className="text-red-400">*</span>
            </label>
            <textarea
              required
              rows={4}
              placeholder="Provide exact vector payload, steps to reproduce, and captured stack trace..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl p-3.5 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-all shadow-inner"
            />
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 font-mono">
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Subsystem:</label>
              <select
                value={componentId}
                onChange={(e) => setComponentId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-cyan-500"
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
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Severity:</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as BugSeverity)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="blocker">Blocker (Level 1)</option>
                <option value="critical">Critical (Level 2)</option>
                <option value="major">Major (Level 3)</option>
                <option value="normal">Normal (Level 4)</option>
                <option value="minor">Minor (Level 5)</option>
                <option value="trivial">Trivial</option>
                <option value="enhancement">Enhancement</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Priority:</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as BugPriority)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="highest">P0 (Highest)</option>
                <option value="high">P1 (High)</option>
                <option value="normal">P2 (Normal)</option>
                <option value="low">P3 (Low)</option>
                <option value="lowest">P4 (Lowest)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Assign Operator:</label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-cyan-500"
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

          {/* Milestone, Version, Estimate Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 font-mono">
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1 flex items-center gap-1">
                <MilestoneIcon className="w-3 h-3 text-cyan-400" /> Target Milestone:
              </label>
              <select
                value={targetMilestone}
                onChange={(e) => setTargetMilestone(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="">None (Backlog)</option>
                {milestones.map((m) => (
                  <option key={m.id} value={m.name}>{m.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Found in Version:</label>
              <select
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="">None / Unspecified</option>
                {versions.map((v) => (
                  <option key={v.id} value={v.name}>{v.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-400" /> Estimated Hours:
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                placeholder="e.g. 4.0"
                value={estimatedTime}
                onChange={(e) => setEstimatedTime(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Keywords / Labels Selection */}
          <div>
            <label className="block text-[10px] uppercase font-mono font-bold text-slate-400 mb-1.5 flex items-center gap-1">
              <Tag className="w-3 h-3 text-cyan-400" /> Keywords & Labels:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {keywords.map((kw) => {
                const isSelected = selectedKeywords.includes(kw.id);
                return (
                  <button
                    key={kw.id}
                    type="button"
                    onClick={() => toggleKeyword(kw.id)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-mono border transition-all ${
                      isSelected
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 font-bold shadow-glow-cyan'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    #{kw.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Security Group Toggle */}
          <div className="pt-1">
            <label className="flex items-center gap-2.5 text-xs font-mono text-slate-300 cursor-pointer p-3 rounded-xl bg-purple-950/20 border border-purple-500/30 hover:border-purple-500/60 transition-all">
              <input
                type="checkbox"
                checked={isConfidential}
                onChange={(e) => setIsConfidential(e.target.checked)}
                className="rounded bg-slate-950 border-purple-500/50 text-purple-500 focus:ring-0"
              />
              <ShieldAlert className="w-4 h-4 text-purple-400" />
              <span>Restricted Confidential Incident (Lock visibility to Security Core Team)</span>
            </label>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800 font-mono">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="cyber-btn-primary !px-5 !py-2 text-xs"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              <span>Submit Incident Dossier</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

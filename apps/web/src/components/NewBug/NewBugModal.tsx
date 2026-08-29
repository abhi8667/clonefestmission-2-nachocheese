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
      fetchMilestones().then((r) => setMilestones(r.milestones || [])).catch(() => { });
      fetchVersions().then((r) => setVersions(r.versions || [])).catch(() => { });
      fetchKeywords().then((r) => setKeywords(r.keywords || [])).catch(() => { });
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in"
      onClick={onClose}
    >
      <div
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-bug-modal-title"
        className="w-full max-w-3xl bg-[#080808] border-2 border-foreground shadow-brutalist overflow-hidden my-6 animate-slide-up flex flex-col max-h-[92vh] text-foreground font-mono"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Brutalist Window Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-[#121212] border-b-2 border-foreground">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 bg-[#ea580c]" />
            <span className="h-2.5 w-2.5 bg-foreground" />
            <span className="h-2.5 w-2.5 border border-foreground" />
            <span className="ml-2 text-xs font-mono font-bold uppercase tracking-widest text-foreground">
              INTAKE: FILE_INCIDENT.SYS // v3.1.0
            </span>
          </div>

          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1 border border-border hover:border-foreground text-muted-foreground hover:text-foreground bg-[#080808] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 border-2 border-red-500 bg-red-950/80 text-red-200 text-xs font-mono flex items-center gap-2 uppercase">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Title */}
          <div>
            <label htmlFor="new-bug-title" className="block text-xs font-mono font-bold text-foreground mb-1.5 uppercase">
              // SUMMARY / INCIDENT TITLE <span className="text-[#ea580c]">*</span>
            </label>
            <input
              id="new-bug-title"
              type="text"
              required
              placeholder="e.g. MEMORY CORRUPTION IN PARALLEL TLS HANDSHAKE"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-[#0d0d0d] border-2 border-border p-2.5 text-xs font-mono text-foreground placeholder-muted-foreground focus:outline-none focus:border-foreground uppercase transition-all"
            />
          </div>

          {/* Duplicate Radar Card */}
          {(duplicates.length > 0 || isCheckingDuplicates) && (
            <div
              role="region"
              aria-live="polite"
              aria-label="Duplicate radar suggestions"
              className="p-3.5 bg-[#0d0d0d] border-2 border-[#ea580c] shadow-brutalist space-y-2.5 animate-slide-up"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Radar className={`w-4 h-4 text-[#ea580c] ${isCheckingDuplicates ? 'animate-spin' : 'animate-blink'}`} />
                  <span className="text-xs font-bold font-mono text-foreground uppercase">
                    // RADAR VECTOR MATCHES ({duplicates.length})
                  </span>
                </div>
                <span className="text-[9px] text-muted-foreground uppercase font-mono">384-DIM COSINE PROJECTION</span>
              </div>

              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-0.5">
                {duplicates.map((dup) => {
                  const matchPct = Math.round(dup.similarity_score * 100);
                  const isHighMatch = matchPct >= 70;

                  return (
                    <div
                      key={dup.bug_id}
                      className="p-2 border border-border bg-[#080808] flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0 font-mono">
                        <span
                          className={`px-1.5 py-0.2 text-[9px] font-bold uppercase ${isHighMatch
                              ? 'bg-[#ea580c] text-background'
                              : 'bg-foreground text-background'
                            }`}
                        >
                          {matchPct}% MATCH
                        </span>
                        <span className="font-bold text-foreground">#{dup.bug_id}</span>
                        <span className="text-foreground truncate">{dup.title}</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onSelectBug(dup.bug_id);
                        }}
                        className="px-2 py-0.5 border border-border hover:border-foreground text-[10px] uppercase font-bold text-foreground bg-transparent flex items-center gap-1 shrink-0"
                      >
                        <span>VIEW</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-xs font-mono font-bold text-foreground mb-1.5 uppercase">
              // REPRODUCTION STEPS & LOGS <span className="text-[#ea580c]">*</span>
            </label>
            <textarea
              required
              rows={4}
              placeholder="PROVIDE EXACT VECTOR PAYLOAD, REPRO STEPS, AND STACK TRACE..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-[#0d0d0d] border-2 border-border p-2.5 text-xs font-mono text-foreground placeholder-muted-foreground focus:outline-none focus:border-foreground uppercase transition-all"
            />
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 font-mono text-xs">
            <div>
              <label className="block text-[10px] uppercase font-bold text-muted-foreground mb-1">// SUBSYSTEM:</label>
              <select
                value={componentId}
                onChange={(e) => setComponentId(e.target.value)}
                className="w-full bg-[#0d0d0d] border-2 border-border p-2 text-xs text-foreground focus:outline-none focus:border-foreground uppercase"
              >
                <option value="core">CORE ENGINE</option>
                <option value="auth">AUTH & SECURITY</option>
                <option value="ui">WEB CLIENT</option>
                <option value="api">REST & SSE GATEWAY</option>
                <option value="db">STORAGE & DB</option>
                <option value="git">GITHUB INTEGRATION</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-muted-foreground mb-1">// SEVERITY:</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as BugSeverity)}
                className="w-full bg-[#0d0d0d] border-2 border-border p-2 text-xs text-foreground focus:outline-none focus:border-foreground uppercase"
              >
                <option value="blocker">BLOCKER // S1</option>
                <option value="critical">CRITICAL // S2</option>
                <option value="major">MAJOR // S3</option>
                <option value="normal">NORMAL // S4</option>
                <option value="minor">MINOR // S5</option>
                <option value="trivial">TRIVIAL // S6</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-muted-foreground mb-1">// PRIORITY:</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as BugPriority)}
                className="w-full bg-[#0d0d0d] border-2 border-border p-2 text-xs text-foreground focus:outline-none focus:border-foreground uppercase"
              >
                <option value="highest">P1 // HIGHEST</option>
                <option value="high">P2 // HIGH</option>
                <option value="normal">P3 // NORMAL</option>
                <option value="low">P4 // LOW</option>
                <option value="lowest">P5 // LOWEST</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-muted-foreground mb-1">// ASSIGNEE:</label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full bg-[#0d0d0d] border-2 border-border p-2 text-xs text-foreground focus:outline-none focus:border-foreground uppercase"
              >
                <option value="">// UNASSIGNED</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    @{u.username} ({u.name})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Additional Capability Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 font-mono text-xs">
            <div>
              <label className="block text-[10px] uppercase font-bold text-muted-foreground mb-1">// TARGET MILESTONE:</label>
              <select
                value={targetMilestone}
                onChange={(e) => setTargetMilestone(e.target.value)}
                className="w-full bg-[#0d0d0d] border-2 border-border p-2 text-xs text-foreground focus:outline-none focus:border-foreground uppercase"
              >
                <option value="">// NONE</option>
                {milestones.map((m) => (
                  <option key={m.id} value={m.name}>
                    {m.name.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-muted-foreground mb-1">// VERSION:</label>
              <select
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                className="w-full bg-[#0d0d0d] border-2 border-border p-2 text-xs text-foreground focus:outline-none focus:border-foreground uppercase"
              >
                <option value="">// NONE</option>
                {versions.map((v) => (
                  <option key={v.id} value={v.name}>
                    v{v.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-muted-foreground mb-1">// ESTIMATE (HOURS):</label>
              <input
                type="number"
                step="0.5"
                min="0"
                placeholder="0"
                value={estimatedTime}
                onChange={(e) => setEstimatedTime(e.target.value)}
                className="w-full bg-[#0d0d0d] border-2 border-border p-2 text-xs text-foreground focus:outline-none focus:border-foreground uppercase"
              >
              </input>
            </div>
          </div>

          {/* Keywords & Security Group Row */}
          <div className="p-3 bg-[#0d0d0d] border-2 border-border space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-muted-foreground">// TACTICAL TAGS:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {keywords.map((kw) => {
                const isSel = selectedKeywords.includes(kw.id);
                return (
                  <button
                    key={kw.id}
                    type="button"
                    onClick={() => toggleKeyword(kw.id)}
                    className={`px-2 py-0.5 text-[10px] font-mono uppercase border transition-all ${isSel
                        ? 'bg-foreground text-background border-foreground font-bold'
                        : 'bg-black text-muted-foreground border-border hover:border-foreground hover:text-foreground'
                      }`}
                  >
                    #{kw.name}
                  </button>
                );
              })}
            </div>

            <div className="pt-2 border-t border-border flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-mono uppercase">
                <input
                  type="checkbox"
                  checked={isConfidential}
                  onChange={(e) => setIsConfidential(e.target.checked)}
                  className="rounded-none bg-black border-border text-foreground focus:ring-0"
                />
                <span className="font-bold text-foreground">RESTRICT ACCESS (grp_sec SECURITY GROUP)</span>
              </label>
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t-2 border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border-2 border-border hover:border-foreground text-xs uppercase font-bold text-muted-foreground hover:text-foreground transition-all"
            >
              CANCEL
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="brutalist-btn disabled:opacity-50"
            >
              <span className="btn-icon-block">
                {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5 stroke-[3]" />}
              </span>
              <span className="btn-text-block">SUBMIT REPORT</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

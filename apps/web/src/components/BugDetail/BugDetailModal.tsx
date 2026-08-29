import React, { useState, useEffect } from 'react';
import {
  X,
  MessageSquare,
  GitFork,
  Flag as FlagIcon,
  GitBranch,
  History,
  ShieldAlert,
  Users,
  Send,
  Loader2,
  Lock,
  ExternalLink,
  Flame,
  AlertTriangle,
  Download,
  Eye,
  EyeOff,
  Tag,
  Clock,
  Plus,
  Milestone as MilestoneIcon,
  Radio,
  FileCode,
  ShieldCheck
} from 'lucide-react';
import {
  fetchBugDetail,
  addComment,
  sendPresenceHeartbeat,
  exportFlowReportAsHtml,
  watchBug,
  unwatchBug,
  addBugKeyword,
  removeBugKeyword,
  fetchKeywords
} from '../../services/api.ts';
import { FlowTimeline } from './FlowTimeline.tsx';
import { StatusTransitionDropdown } from './StatusTransitionDropdown.tsx';
import { FlagsPanel } from './FlagsPanel.tsx';
import { RelationshipsPanel } from './RelationshipsPanel.tsx';
import { ActivityLogPanel } from './ActivityLogPanel.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { useSSE } from '../../context/SSEContext.tsx';
import { useFocusTrap } from '../../hooks/useFocusTrap.ts';
import { DetailSkeleton } from '../Common/LoadingSkeleton.tsx';
import { AnimatedCounter } from '../Cyber/AnimatedCounter.tsx';

interface BugDetailModalProps {
  bugId: number | null;
  onClose: () => void;
  onSelectBug: (id: number) => void;
}

export const BugDetailModal: React.FC<BugDetailModalProps> = ({
  bugId,
  onClose,
  onSelectBug
}) => {
  const { currentUser } = useAuth();
  const trapRef = useFocusTrap<HTMLDivElement>({
    isOpen: bugId !== null,
    onClose
  });
  const { lastEvent } = useSSE();
  const [data, setData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'comments' | 'relationships' | 'flags' | 'git' | 'activity'>('comments');
  const [newComment, setNewComment] = useState('');
  const [workTime, setWorkTime] = useState<string>('');
  const [isPrivateComment, setIsPrivateComment] = useState(false);
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [allKeywords, setAllKeywords] = useState<any[]>([]);
  const [isAddingKeyword, setIsAddingKeyword] = useState(false);
  const [selectedKeywordToAdd, setSelectedKeywordToAdd] = useState('');

  const loadData = () => {
    if (!bugId) return;
    fetchBugDetail(bugId, currentUser?.id)
      .then((res) => {
        setData(res);
      })
      .catch((err) => {
        console.error('Failed to load bug detail:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    if (bugId) {
      setIsLoading(true);
      loadData();
      fetchKeywords().then((res) => setAllKeywords(res.keywords || [])).catch(() => {});
    }
  }, [bugId, currentUser?.id]);

  // React to live SSE events matching this bug
  useEffect(() => {
    if (!bugId || !lastEvent) return;
    if (lastEvent.data?.bug_id === bugId || lastEvent.type === 'bug:updated') {
      loadData();
    }
  }, [lastEvent]);

  // Presence heartbeat every 10s while open
  useEffect(() => {
    if (!bugId) return;
    sendPresenceHeartbeat(bugId, currentUser?.id);

    const interval = setInterval(() => {
      sendPresenceHeartbeat(bugId, currentUser?.id);
    }, 10000);

    return () => clearInterval(interval);
  }, [bugId, currentUser?.id]);

  if (!bugId) return null;

  const handleToggleWatch = async () => {
    try {
      if (data?.bug?.is_watched) {
        await unwatchBug(bugId, currentUser?.id);
      } else {
        await watchBug(bugId, currentUser?.id);
      }
      loadData();
    } catch (err) {}
  };

  const handleAddKeyword = async () => {
    if (!selectedKeywordToAdd) return;
    try {
      await addBugKeyword(bugId, selectedKeywordToAdd, currentUser?.id);
      setIsAddingKeyword(false);
      setSelectedKeywordToAdd('');
      loadData();
    } catch (err) {}
  };

  const handleRemoveKeyword = async (keywordId: string) => {
    try {
      await removeBugKeyword(bugId, keywordId, currentUser?.id);
      loadData();
    } catch (err) {}
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setIsPostingComment(true);
    try {
      const parsedWork = workTime ? parseFloat(workTime) : 0;
      await addComment(bugId, newComment, isPrivateComment, parsedWork, currentUser?.id);
      setNewComment('');
      setWorkTime('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to post comment');
    } finally {
      setIsPostingComment(false);
    }
  };

  // Compute total logged work time from comments
  const totalLoggedWorkHours = (data?.comments || []).reduce((acc: number, c: any) => acc + (Number(c.work_time) || 0), 0);
  const elapsedFlowHours = Math.round((data?.flow_metrics?.total_lead_time_ms || 0) / (3600 * 1000));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto animate-fade-in"
      onClick={onClose}
    >
      <div
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bug-detail-modal-title"
        className="w-full max-w-5xl bg-slate-950 border border-cyan-500/30 rounded-2xl shadow-2xl overflow-hidden my-6 animate-slide-up flex flex-col max-h-[92vh] cyber-corners"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header HUD */}
        <div className="p-4 lg:p-6 border-b border-slate-800 bg-slate-950/95 flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2.5 flex-wrap">
              <span className="font-mono text-base font-extrabold text-cyan-400">
                #{data?.bug?.id || bugId}
              </span>

              {data?.bug && (
                <StatusTransitionDropdown
                  bugId={data.bug.id}
                  currentStatus={data.bug.status}
                  availableTransitions={data.available_transitions || []}
                  onTransitionSuccess={loadData}
                />
              )}

              {data?.bug?.security_group_id && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-purple-950/80 text-purple-300 border border-purple-500/50 text-xs font-mono font-semibold shadow-glow-purple">
                  <ShieldAlert className="w-3.5 h-3.5 text-purple-400" />
                  <span>CLASSIFIED SECURITY DOSSIER</span>
                </span>
              )}

              {/* Live Presence Viewers */}
              {data?.viewers && data.viewers.length > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-300">
                  <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
                  <span>
                    Operators in dossier: <strong className="text-cyan-300">@{data.viewers.map((v: any) => v.username).join(', @')}</strong>
                  </span>
                </div>
              )}
            </div>

            <h2 id="bug-detail-modal-title" className="text-lg lg:text-xl font-bold text-white leading-snug">
              {data?.bug?.title || 'Decrypting incident dossier...'}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {/* Watch / Unwatch Toggle */}
            {data?.bug && (
              <button
                onClick={handleToggleWatch}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-semibold border flex items-center gap-1.5 transition-all shadow-sm ${
                  data.bug.is_watched
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-glow-cyan'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
                title={data.bug.is_watched ? 'Watching incident. Click to unwatch' : 'Click to watch and receive telemetry updates'}
              >
                {data.bug.is_watched ? <Eye className="w-3.5 h-3.5 text-cyan-400" /> : <EyeOff className="w-3.5 h-3.5" />}
                <span>{data.bug.is_watched ? 'Telemetry Active' : 'Watch'} ({data.bug.watchers?.length || 0})</span>
              </button>
            )}

            {data?.bug && (
              <button
                onClick={() => exportFlowReportAsHtml(data)}
                className="px-3 py-1.5 rounded-xl text-xs font-mono font-semibold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 flex items-center gap-1.5 transition-all shadow-sm"
                title="Download Standalone Flow & Post-Mortem HTML Report"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">Export Dossier</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-all"
              aria-label="Close dossier modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        {isLoading ? (
          <DetailSkeleton />
        ) : (
          <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-5">
            {/* Headline #1: Per-Bug Flow Timeline */}
            {data?.bug && (
              <FlowTimeline
                bug={data.bug}
                activity={data.activity || []}
                gitLinks={data.git_links || []}
                flowMetrics={data.flow_metrics}
                flags={data.flags || []}
                onOpenFlag={(flagId) => setActiveTab('flags')}
              />
            )}

            {/* Core Metadata Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-900/90 p-4 rounded-2xl border border-slate-800 text-xs font-mono">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Reporter / Origin</span>
                <span className="font-semibold text-slate-200 mt-0.5 block">
                  {data?.bug?.reporter?.name || data?.bug?.reporter_id} (@{data?.bug?.reporter?.username || 'reporter'})
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Assigned Operator</span>
                <span className="font-semibold text-cyan-300 mt-0.5 block">
                  {data?.bug?.assignee?.name || 'Unassigned'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Subsystem Vector</span>
                <span className="text-white font-bold uppercase mt-0.5 block">
                  {data?.bug?.component_id} ({data?.bug?.component_name || 'Core'})
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Threat Level</span>
                <span className="font-semibold text-amber-300 uppercase mt-0.5 block">
                  {data?.bug?.severity} / {data?.bug?.priority}
                </span>
              </div>
            </div>

            {/* Capability Bar: Milestone, Version, Keywords & Time Tracking */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* Milestone & Keywords */}
              <div className="p-4 bg-slate-900/90 rounded-2xl border border-slate-800 text-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-mono font-semibold flex items-center gap-1.5">
                    <MilestoneIcon className="w-3.5 h-3.5 text-cyan-400" />
                    Target Milestone & Version
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono px-2.5 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[11px] font-bold">
                      {data?.bug?.target_milestone || 'None'}
                    </span>
                    {data?.bug?.version && (
                      <span className="font-mono px-2 py-0.5 rounded-md bg-slate-950 text-slate-300 border border-slate-700 text-[10px]">
                        v{data.bug.version}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                  <span className="text-slate-400 font-mono font-semibold flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-cyan-400" />
                    Keywords & Tactical Tags
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {data?.bug?.keywords?.map((kw: any) => (
                      <span
                        key={kw.id}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono bg-cyan-950/80 text-cyan-300 border border-cyan-500/40"
                      >
                        #{kw.name}
                        <button
                          onClick={() => handleRemoveKeyword(kw.id)}
                          className="hover:text-red-400 text-slate-500 ml-0.5"
                          title="Remove tag"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    {isAddingKeyword ? (
                      <div className="flex items-center gap-1.5">
                        <select
                          value={selectedKeywordToAdd}
                          onChange={(e) => setSelectedKeywordToAdd(e.target.value)}
                          className="bg-slate-950 border border-slate-700 text-slate-200 text-[10px] font-mono rounded-lg px-2 py-0.5"
                        >
                          <option value="">Select tag...</option>
                          {allKeywords.map((k) => (
                            <option key={k.id} value={k.id}>{k.name}</option>
                          ))}
                        </select>
                        <button
                          onClick={handleAddKeyword}
                          className="px-2 py-0.5 rounded-lg bg-cyan-600 text-slate-950 font-mono font-bold text-[10px]"
                        >
                          Add
                        </button>
                        <button
                          onClick={() => setIsAddingKeyword(false)}
                          className="text-slate-500 hover:text-white text-[10px] font-mono"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setIsAddingKeyword(true)}
                        className="px-2 py-0.5 rounded-lg border border-dashed border-slate-700 text-slate-400 hover:text-cyan-300 text-[10px] font-mono flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Add Tag
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Time Tracking Comparison */}
              <div className="p-4 bg-slate-900/90 rounded-2xl border border-slate-800 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-mono font-semibold flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    Time Telemetry & Flow Duration
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Estimated: <strong className="text-slate-200">{data?.bug?.estimated_time || 0}h</strong>
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center pt-1 font-mono text-[11px]">
                  <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-slate-500 block text-[9px] uppercase font-bold">Logged Work</span>
                    <span className="text-emerald-400 font-bold text-sm">{totalLoggedWorkHours}h</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-slate-500 block text-[9px] uppercase font-bold">Remaining</span>
                    <span className="text-amber-400 font-bold text-sm">{data?.bug?.remaining_time || 0}h</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-slate-500 block text-[9px] uppercase font-bold">Elapsed Flow</span>
                    <span className="text-cyan-300 font-bold text-sm">{elapsedFlowHours}h</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 text-xs leading-relaxed text-slate-300 whitespace-pre-wrap font-sans">
              <h4 className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                <FileCode className="w-3.5 h-3.5" />
                <span>INCIDENT REPRODUCTION STEPS & LOGS</span>
              </h4>
              {data?.bug?.description}
            </div>

            {/* Tabbed Panels */}
            <div>
              {/* Tab Navigation */}
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-4 font-mono text-xs overflow-x-auto">
                <button
                  onClick={() => setActiveTab('comments')}
                  className={`px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-2 transition-all shrink-0 ${
                    activeTab === 'comments'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-glow-cyan'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  Security Notes ({data?.comments?.length || 0})
                </button>

                <button
                  onClick={() => setActiveTab('relationships')}
                  className={`px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-2 transition-all shrink-0 ${
                    activeTab === 'relationships'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-glow-cyan'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <GitFork className="w-3.5 h-3.5" />
                  Relationships ({data?.relationships?.length || 0})
                </button>

                <button
                  onClick={() => setActiveTab('flags')}
                  className={`px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-2 transition-all shrink-0 ${
                    activeTab === 'flags'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-glow-cyan'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <FlagIcon className="w-3.5 h-3.5" />
                  Clearance Flags ({data?.flags?.length || 0})
                </button>

                <button
                  onClick={() => setActiveTab('git')}
                  className={`px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-2 transition-all shrink-0 ${
                    activeTab === 'git'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-glow-cyan'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <GitBranch className="w-3.5 h-3.5" />
                  Git Linkages ({data?.git_links?.length || 0})
                </button>

                <button
                  onClick={() => setActiveTab('activity')}
                  className={`px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-2 transition-all shrink-0 ${
                    activeTab === 'activity'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-glow-cyan'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <History className="w-3.5 h-3.5" />
                  Audit Log ({data?.activity?.length || 0})
                </button>
              </div>

              {/* Tab Content Panels */}
              {activeTab === 'comments' && (
                <div className="space-y-4">
                  {/* Conversation thread */}
                  <div className="space-y-3">
                    {data?.comments?.map((c: any) => (
                      <div
                        key={c.id}
                        className={`p-4 rounded-2xl border text-xs space-y-2 transition-all ${
                          c.is_private
                            ? 'bg-red-950/30 border-red-500/40 text-red-200 shadow-glow-red'
                            : 'bg-slate-900/80 border-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-wrap font-mono">
                            <span className="font-bold text-slate-200">
                              {c.author?.name || c.author_id}
                            </span>
                            <span className="text-[10px] text-slate-500">@{c.author?.username}</span>
                            {Number(c.work_time) > 0 && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                                <Clock className="w-2.5 h-2.5" /> Logged {c.work_time}h
                              </span>
                            )}
                            {c.is_private && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-red-400 bg-red-950/80 border border-red-500/40 px-2 py-0.5 rounded-md">
                                <Lock className="w-2.5 h-2.5" /> CLASSIFIED NOTE
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] font-mono text-slate-500">
                            {new Date(c.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-slate-300 whitespace-pre-wrap leading-relaxed font-sans">{c.body}</p>
                      </div>
                    ))}

                    {(!data?.comments || data.comments.length === 0) && (
                      <div className="p-8 text-center text-slate-500 text-xs font-mono italic bg-slate-900/40 rounded-2xl border border-slate-800">
                        No security notes or investigation entries logged.
                      </div>
                    )}
                  </div>

                  {/* Add comment form with work time */}
                  <form onSubmit={handlePostComment} className="p-4 rounded-2xl bg-slate-900/90 border border-cyan-500/20 space-y-3 cyber-corners">
                    <textarea
                      rows={3}
                      placeholder="Add investigation note or update telemetry status..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700/80 rounded-xl p-3 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    />

                    <div className="flex flex-wrap items-center justify-between gap-3 font-mono">
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isPrivateComment}
                            onChange={(e) => setIsPrivateComment(e.target.checked)}
                            className="rounded bg-slate-950 border-slate-700 text-cyan-500 focus:ring-0"
                          />
                          <span>Private to Core Security Team</span>
                        </label>

                        <div className="flex items-center gap-1.5 text-xs text-slate-400">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          <span>Work hours:</span>
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            placeholder="0"
                            value={workTime}
                            onChange={(e) => setWorkTime(e.target.value)}
                            className="w-16 px-2 py-0.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white text-right focus:outline-none focus:border-cyan-500"
                          />
                          <span>h</span>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={isPostingComment || !newComment.trim()}
                        className="cyber-btn-primary"
                      >
                        {isPostingComment ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                        <span>Submit Note</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {activeTab === 'relationships' && (
                <RelationshipsPanel
                  bugId={data.bug.id}
                  relationships={data.relationships || []}
                  onRefresh={loadData}
                  onSelectBug={onSelectBug}
                />
              )}

              {activeTab === 'flags' && (
                <FlagsPanel
                  bugId={data.bug.id}
                  flags={data.flags || []}
                  onRefresh={loadData}
                />
              )}

              {activeTab === 'git' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">
                      Connected Git Artifacts (Branches, Commits, PRs)
                    </h4>
                  </div>

                  <div className="space-y-2">
                    {data?.git_links?.map((g: any) => (
                      <div
                        key={g.id}
                        className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs font-mono"
                      >
                        <div className="flex items-center gap-3">
                          <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
                            {g.kind}
                          </span>
                          <div>
                            <span className="font-semibold text-slate-200">{g.ref}</span>
                            <p className="text-[10px] text-slate-500">State: {g.state}</p>
                          </div>
                        </div>

                        <a
                          href={g.url}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-[11px] text-cyan-300 border border-slate-800 flex items-center gap-1.5 transition-all"
                        >
                          <span>Inspect</span>
                          <ExternalLink className="w-3 h-3 text-slate-500" />
                        </a>
                      </div>
                    ))}

                    {(!data?.git_links || data.git_links.length === 0) && (
                      <div className="p-8 text-center text-slate-500 text-xs font-mono italic bg-slate-900/40 rounded-2xl border border-slate-800">
                        Zero linked git branches or pull requests. Link commits via 'Fixes #{data.bug.id}'.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'activity' && (
                <ActivityLogPanel activity={data.activity || []} />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

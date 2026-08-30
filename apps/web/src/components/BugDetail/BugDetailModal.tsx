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
      fetchKeywords().then((res) => setAllKeywords(res.keywords || [])).catch(() => { });
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
    } catch (err) { }
  };

  const handleAddKeyword = async () => {
    if (!selectedKeywordToAdd) return;
    try {
      await addBugKeyword(bugId, selectedKeywordToAdd, currentUser?.id);
      setIsAddingKeyword(false);
      setSelectedKeywordToAdd('');
      loadData();
    } catch (err) { }
  };

  const handleRemoveKeyword = async (keywordId: string) => {
    try {
      await removeBugKeyword(bugId, keywordId, currentUser?.id);
      loadData();
    } catch (err) { }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setIsPostingComment(true);
    try {
      await addComment(
        bugId,
        newComment.trim(),
        isPrivateComment,
        workTime ? parseFloat(workTime) : 0,
        currentUser?.id
      );
      setNewComment('');
      setWorkTime('');
      setIsPrivateComment(false);
      loadData();
    } catch (err) {
      console.error('Failed to post comment:', err);
    } finally {
      setIsPostingComment(false);
    }
  };

  const totalLoggedWorkHours = (data?.comments || []).reduce(
    (acc: number, c: any) => acc + (Number(c.work_time) || 0),
    0
  );

  const elapsedFlowHours = data?.bug?.created_at
    ? Math.max(1, Math.round((Date.now() - new Date(data.bug.created_at).getTime()) / (3600 * 1000)))
    : 0;

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bug-detail-modal-title"
    >
      <div
        ref={trapRef}
        className="w-full max-w-5xl bg-[#080808] border border-border shadow-2xl max-h-[92vh] flex flex-col overflow-hidden text-foreground font-mono rounded-sm"
      >
        {/* Window Header */}
        <div className="flex items-center justify-between px-5 py-2.5 bg-[#121212] border-b border-border">
          <div className="flex items-center gap-2.5">
            <span className="h-2 w-2 bg-[#B497CF] rounded-full" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-foreground">
              INCIDENT DOSSIER #{bugId}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[10px] text-muted-foreground uppercase hidden sm:inline">
              [ESC TO CLOSE]
            </span>
            <button
              onClick={onClose}
              className="p-1 border border-border hover:border-foreground text-muted-foreground hover:text-foreground bg-[#080808] transition-colors rounded-sm"
              aria-label="Close dossier modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Banner & Title */}
        <div className="p-5 lg:p-7 border-b border-border bg-[#0d0d0d] flex flex-wrap items-start justify-between gap-4">
          <div className="flex-1 min-w-[280px]">
            <div className="flex items-center gap-2.5 flex-wrap mb-2.5">
              <span className="px-2 py-0.5 bg-foreground text-background font-bold text-xs rounded-sm">
                #{bugId}
              </span>

              {/* Status Transition Guard Dropdown */}
              {data?.bug && (
                <StatusTransitionDropdown
                  bugId={data.bug.id}
                  currentStatus={data.bug.status}
                  availableTransitions={data.available_transitions || []}
                  onTransitionSuccess={loadData}
                />
              )}

              {data?.bug?.security_group_id && (
                <span className="px-2 py-0.5 bg-purple-950 text-purple-300 border border-purple-500 text-xs font-bold uppercase rounded-sm">
                  CONFIDENTIAL SECURITY
                </span>
              )}

              {/* Live Presence Viewers */}
              {data?.viewers && data.viewers.length > 0 && (
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-black border border-border text-[10px] text-muted-foreground rounded-sm">
                  <span className="w-1.5 h-1.5 bg-emerald-400 animate-blink rounded-full" />
                  <span>
                    VIEWERS: <strong className="text-foreground">@{data.viewers.map((v: any) => v.username).join(', @')}</strong>
                  </span>
                </div>
              )}
            </div>

            <h2 id="bug-detail-modal-title" className="text-lg lg:text-xl font-bold text-foreground leading-snug uppercase">
              {data?.bug?.title || 'LOADING INCIDENT DOSSIER...'}
            </h2>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Watch / Unwatch Toggle */}
            {data?.bug && (
              <button
                onClick={handleToggleWatch}
                className={`px-3 py-1.5 text-xs font-mono uppercase font-bold border transition-all rounded-sm ${data.bug.is_watched
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-transparent text-muted-foreground border-border hover:border-foreground hover:text-foreground'
                  }`}
                title={data.bug.is_watched ? 'Watching incident' : 'Click to watch'}
              >
                {data.bug.is_watched ? '✓ WATCHING' : '+ WATCH'} ({data.bug.watchers?.length || 0})
              </button>
            )}

            {data?.bug && (
              <button
                onClick={() => exportFlowReportAsHtml(data)}
                className="px-3 py-1.5 text-xs font-mono uppercase font-bold border border-border hover:border-foreground text-foreground bg-transparent transition-all flex items-center gap-1.5 rounded-sm"
                title="Download Standalone HTML Report"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">EXPORT HTML</span>
              </button>
            )}
          </div>
        </div>

        {/* Content Body */}
        {isLoading ? (
          <DetailSkeleton />
        ) : (
          <div className="flex-1 overflow-y-auto p-5 lg:p-7 space-y-6">
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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 border border-border bg-[#0d0d0d] text-xs font-mono rounded-sm overflow-hidden">
              <div className="p-3.5 border-r border-b sm:border-b-0 border-border">
                <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">REPORTER</span>
                <span className="font-bold text-foreground mt-1 block uppercase">
                  @{data?.bug?.reporter?.username || 'reporter'}
                </span>
              </div>
              <div className="p-3.5 border-r border-b sm:border-b-0 border-border">
                <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">ASSIGNEE</span>
                <span className="font-bold text-[#B497CF] mt-1 block uppercase">
                  {data?.bug?.assignee ? `@${data.bug.assignee.username}` : 'UNASSIGNED'}
                </span>
              </div>
              <div className="p-3.5 border-r border-border">
                <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">SUBSYSTEM</span>
                <span className="text-foreground font-bold uppercase mt-1 block">
                  {data?.bug?.component_id}
                </span>
              </div>
              <div className="p-3.5">
                <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">PRIORITY / SEVERITY</span>
                <span className="font-bold text-foreground uppercase mt-1 block">
                  {data?.bug?.priority} / {data?.bug?.severity}
                </span>
              </div>
            </div>

            {/* Capability Bar: Milestone, Version, Keywords & Time Tracking */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Milestone & Keywords */}
              <div className="p-4 bg-[#0d0d0d] border border-border text-xs space-y-3 rounded-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-mono font-bold uppercase flex items-center gap-1.5">
                    TARGET MILESTONE
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-foreground text-background text-[10px] font-bold uppercase rounded-sm">
                      {data?.bug?.target_milestone || 'NONE'}
                    </span>
                    {data?.bug?.version && (
                      <span className="px-1.5 py-0.5 border border-border text-muted-foreground text-[10px] uppercase rounded-sm">
                        v{data.bug.version}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2.5 border-t border-border">
                  <span className="text-muted-foreground font-mono font-bold uppercase flex items-center gap-1.5">
                    TAGS & KEYWORDS
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {data?.bug?.keywords?.map((kw: any) => (
                      <span
                        key={kw.id}
                        className="inline-flex items-center gap-1 px-1.5 py-0.2 text-[10px] font-mono bg-black text-foreground border border-border uppercase rounded-sm"
                      >
                        #{kw.name}
                        <button
                          onClick={() => handleRemoveKeyword(kw.id)}
                          className="hover:text-red-400 text-muted-foreground ml-0.5"
                          title="Remove tag"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    {isAddingKeyword ? (
                      <div className="flex items-center gap-1">
                        <select
                          value={selectedKeywordToAdd}
                          onChange={(e) => setSelectedKeywordToAdd(e.target.value)}
                          className="bg-black border border-border text-foreground text-[10px] font-mono px-1.5 py-0.5 uppercase rounded-sm"
                        >
                          <option value="">SELECT...</option>
                          {allKeywords.map((k) => (
                            <option key={k.id} value={k.id}>{k.name.toUpperCase()}</option>
                          ))}
                        </select>
                        <button
                          onClick={handleAddKeyword}
                          className="px-2 py-0.5 bg-foreground text-background text-[10px] font-bold uppercase rounded-sm"
                        >
                          ADD
                        </button>
                        <button
                          onClick={() => setIsAddingKeyword(false)}
                          className="text-muted-foreground hover:text-foreground text-[10px]"
                        >
                          CANCEL
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setIsAddingKeyword(true)}
                        className="px-1.5 py-0.2 border border-dashed border-border text-muted-foreground hover:text-foreground text-[10px] uppercase rounded-sm"
                      >
                        + ADD TAG
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Time Tracking Comparison */}
              <div className="p-4 bg-[#0d0d0d] border border-border text-xs space-y-3 rounded-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-mono font-bold uppercase flex items-center gap-1.5">
                    TIME TRACKING
                  </span>
                  <span className="text-[10px] text-muted-foreground uppercase">
                    ESTIMATED: <strong className="text-foreground">{data?.bug?.estimated_time || 0}H</strong>
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center pt-1 font-mono text-[11px]">
                  <div className="p-2 border border-border bg-black rounded-sm">
                    <span className="text-muted-foreground block text-[9px] uppercase font-bold">LOGGED</span>
                    <span className="text-[#B497CF] font-bold text-sm">{totalLoggedWorkHours}H</span>
                  </div>
                  <div className="p-2 border border-border bg-black rounded-sm">
                    <span className="text-muted-foreground block text-[9px] uppercase font-bold">REMAINING</span>
                    <span className="text-foreground font-bold text-sm">{data?.bug?.remaining_time || 0}H</span>
                  </div>
                  <div className="p-2 border border-border bg-black rounded-sm">
                    <span className="text-muted-foreground block text-[9px] uppercase font-bold">ELAPSED</span>
                    <span className="text-foreground font-bold text-sm">{elapsedFlowHours}H</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="bg-[#0d0d0d] p-4 sm:p-5 border border-border text-xs leading-relaxed text-foreground whitespace-pre-wrap font-mono rounded-sm">
              <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                REPRODUCTION DETAILS & INCIDENT NOTES
              </h4>
              {data?.bug?.description}
            </div>

            {/* Tabbed Panels */}
            <div>
              {/* Tab Navigation */}
              <div className="flex items-center gap-1.5 border-b border-border pb-2 mb-4 font-mono text-xs overflow-x-auto">
                <button
                  onClick={() => setActiveTab('comments')}
                  className={`px-3 py-1 text-xs uppercase font-bold transition-all shrink-0 border ${activeTab === 'comments'
                      ? 'bg-foreground text-background border-foreground'
                      : 'text-muted-foreground hover:text-foreground border-transparent'
                    }`}
                >
                  NOTES ({data?.comments?.length || 0})
                </button>

                <button
                  onClick={() => setActiveTab('relationships')}
                  className={`px-3 py-1 text-xs uppercase font-bold transition-all shrink-0 border ${activeTab === 'relationships'
                      ? 'bg-foreground text-background border-foreground'
                      : 'text-muted-foreground hover:text-foreground border-transparent'
                    }`}
                >
                  RELATIONSHIPS ({data?.relationships?.length || 0})
                </button>

                <button
                  onClick={() => setActiveTab('flags')}
                  className={`px-3 py-1 text-xs uppercase font-bold transition-all shrink-0 border ${activeTab === 'flags'
                      ? 'bg-foreground text-background border-foreground'
                      : 'text-muted-foreground hover:text-foreground border-transparent'
                    }`}
                >
                  FLAGS ({data?.flags?.length || 0})
                </button>

                <button
                  onClick={() => setActiveTab('git')}
                  className={`px-3 py-1 text-xs uppercase font-bold transition-all shrink-0 border ${activeTab === 'git'
                      ? 'bg-foreground text-background border-foreground'
                      : 'text-muted-foreground hover:text-foreground border-transparent'
                    }`}
                >
                  GIT ARTIFACTS ({data?.git_links?.length || 0})
                </button>

                <button
                  onClick={() => setActiveTab('activity')}
                  className={`px-3 py-1 text-xs uppercase font-bold transition-all shrink-0 border ${activeTab === 'activity'
                      ? 'bg-foreground text-background border-foreground'
                      : 'text-muted-foreground hover:text-foreground border-transparent'
                    }`}
                >
                  AUDIT LOG ({data?.activity?.length || 0})
                </button>
              </div>

              {/* Tab Content Panels */}
              {activeTab === 'comments' && (
                <div className="space-y-4">
                  {/* Conversation thread */}
                  <div className="space-y-2">
                    {data?.comments?.map((c: any) => (
                      <div
                        key={c.id}
                        className={`p-3 border-2 text-xs space-y-1.5 transition-all ${c.is_private
                            ? 'bg-red-950/20 border-red-500 text-red-200'
                            : 'bg-[#0d0d0d] border-border'
                          }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-wrap font-mono text-[10px]">
                            <span className="font-bold text-foreground uppercase">
                              @{c.author?.username || c.author_id}
                            </span>
                            {Number(c.work_time) > 0 && (
                              <span className="px-1 py-0.2 bg-[#B497CF] text-background font-bold uppercase">
                                +{c.work_time}H WORK
                              </span>
                            )}
                            {c.is_private && (
                              <span className="px-1 py-0.2 bg-red-950 text-red-300 border border-red-500 font-bold uppercase">
                                [CLASSIFIED]
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] font-mono text-muted-foreground">
                            {new Date(c.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-foreground whitespace-pre-wrap leading-relaxed font-mono">{c.body}</p>
                      </div>
                    ))}

                    {(!data?.comments || data.comments.length === 0) && (
                      <div className="p-6 text-center text-muted-foreground text-xs font-mono uppercase border border-border bg-[#0d0d0d]">
                        // ZERO AUDIT ENTRIES LOGGED
                      </div>
                    )}
                  </div>

                  {/* Add comment form with work time */}
                  <form onSubmit={handlePostComment} className="p-3 bg-[#0d0d0d] border-2 border-foreground/30 space-y-3">
                    <textarea
                      rows={3}
                      placeholder="ENTER AUDIT NOTE OR INCIDENT LOG..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="w-full bg-[#080808] border-2 border-border p-2.5 text-xs font-mono text-foreground placeholder-muted-foreground focus:outline-none focus:border-foreground uppercase"
                    />

                    <div className="flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 text-muted-foreground hover:text-foreground cursor-pointer uppercase text-[11px]">
                          <input
                            type="checkbox"
                            checked={isPrivateComment}
                            onChange={(e) => setIsPrivateComment(e.target.checked)}
                            className="rounded-none bg-black border-border text-foreground focus:ring-0"
                          />
                          <span>RESTRICT TO CORE TEAM</span>
                        </label>

                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground uppercase">
                          <span>LOG HOURS:</span>
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            placeholder="0"
                            value={workTime}
                            onChange={(e) => setWorkTime(e.target.value)}
                            className="w-14 px-1.5 py-0.5 bg-black border border-border text-xs text-foreground text-right focus:outline-none focus:border-foreground"
                          />
                          <span>H</span>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={isPostingComment || !newComment.trim()}
                        className="px-4 py-1.5 bg-foreground text-background font-bold text-xs uppercase flex items-center gap-1.5 hover:bg-white disabled:opacity-50"
                      >
                        {isPostingComment ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                        <span>SUBMIT NOTE</span>
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
                    <h4 className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-wider">
                      // CONNECTED GIT ARTIFACTS
                    </h4>
                  </div>

                  <div className="space-y-2">
                    {data?.git_links?.map((g: any) => (
                      <div
                        key={g.id}
                        className="flex items-center justify-between p-3 border-2 border-border bg-[#0d0d0d] text-xs font-mono"
                      >
                        <div className="flex items-center gap-3">
                          <span className="px-2 py-0.5 bg-[#B497CF] text-background text-[10px] font-bold uppercase">
                            {g.kind}
                          </span>
                          <div>
                            <span className="font-bold text-foreground">{g.ref}</span>
                            <p className="text-[10px] text-muted-foreground uppercase">STATE: {g.state}</p>
                          </div>
                        </div>

                        <a
                          href={g.url}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1 border border-border hover:border-foreground text-[10px] text-foreground uppercase flex items-center gap-1.5 transition-all"
                        >
                          <span>INSPECT</span>
                          <ExternalLink className="w-3 h-3 text-muted-foreground" />
                        </a>
                      </div>
                    ))}

                    {(!data?.git_links || data.git_links.length === 0) && (
                      <div className="p-6 text-center text-muted-foreground text-xs font-mono uppercase border border-border bg-[#0d0d0d]">
                        // ZERO LINKED GIT ARTIFACTS. LINK COMMITS VIA 'Fixes #{data.bug.id}'.
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

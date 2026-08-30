import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  MessageSquare,
  GitFork,
  Flag as FlagIcon,
  GitBranch,
  History,
  Shield,
  Download,
  Eye,
  EyeOff,
  Send,
  Loader2,
  Clock,
  Radio,
  Tag,
  AlertCircle,
  CheckCircle2
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
} from '../services/api.ts';
import { FlowTimeline } from '../components/BugDetail/FlowTimeline.tsx';
import { StatusTransitionDropdown } from '../components/BugDetail/StatusTransitionDropdown.tsx';
import { FlagsPanel } from '../components/BugDetail/FlagsPanel.tsx';
import { RelationshipsPanel } from '../components/BugDetail/RelationshipsPanel.tsx';
import { ActivityLogPanel } from '../components/BugDetail/ActivityLogPanel.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { useSSE } from '../context/SSEContext.tsx';
import { DetailSkeleton } from '../components/Common/LoadingSkeleton.tsx';

export const IssueDetailView: React.FC = () => {
  const { key = 'CORE', id } = useParams<{ key: string; id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { lastEvent } = useSSE();

  const [data, setData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tab state for side panels
  const [activeSideTab, setActiveSideTab] = useState<'flags' | 'relationships' | 'git' | 'activity'>('flags');

  // Comment Form State
  const [newComment, setNewComment] = useState('');
  const [workTime, setWorkTime] = useState<string>('');
  const [isPrivateComment, setIsPrivateComment] = useState(false);
  const [isPostingComment, setIsPostingComment] = useState(false);

  // Keyword State
  const [allKeywords, setAllKeywords] = useState<any[]>([]);
  const [isAddingKeyword, setIsAddingKeyword] = useState(false);
  const [selectedKeywordToAdd, setSelectedKeywordToAdd] = useState('');

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const res = await fetchBugDetail(id, currentUser?.id);
      setData(res);
    } catch (err: any) {
      console.error('Failed to load issue detail:', err);
      setError(err.message || 'Issue not found');
    } finally {
      setIsLoading(false);
    }
  }, [id, currentUser?.id]);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    loadData();
    fetchKeywords().then((res) => setAllKeywords(res.keywords || [])).catch(() => {});
  }, [loadData]);

  // Handle SSE live refresh
  useEffect(() => {
    if (lastEvent && data?.bug?.id && lastEvent.data?.bug_id === data.bug.id) {
      loadData();
    }
  }, [lastEvent, data?.bug?.id, loadData]);

  // Presence heartbeat
  useEffect(() => {
    if (!data?.bug?.id || !currentUser) return;
    sendPresenceHeartbeat(data.bug.id, currentUser.id).catch(() => {});
    const interval = setInterval(() => {
      sendPresenceHeartbeat(data.bug.id, currentUser.id).catch(() => {});
    }, 15000);
    return () => clearInterval(interval);
  }, [data?.bug?.id, currentUser]);

  const handleToggleWatch = async () => {
    if (!data?.bug) return;
    try {
      if (data.bug.is_watched) {
        await unwatchBug(data.bug.id, currentUser?.id);
      } else {
        await watchBug(data.bug.id, currentUser?.id);
      }
      loadData();
    } catch (err) {
      console.error('Failed to toggle watch:', err);
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !data?.bug) return;

    setIsPostingComment(true);
    try {
      const hours = workTime ? parseFloat(workTime) : 0;
      await addComment(
        data.bug.id,
        newComment.trim(),
        isPrivateComment,
        hours,
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

  const handleAddKeyword = async () => {
    if (!selectedKeywordToAdd || !data?.bug) return;
    try {
      await addBugKeyword(data.bug.id, selectedKeywordToAdd, currentUser?.id);
      setSelectedKeywordToAdd('');
      setIsAddingKeyword(false);
      loadData();
    } catch (err) {
      console.error('Failed to add keyword:', err);
    }
  };

  const handleRemoveKeyword = async (keywordId: string) => {
    if (!data?.bug) return;
    try {
      await removeBugKeyword(data.bug.id, keywordId, currentUser?.id);
      loadData();
    } catch (err) {
      console.error('Failed to remove keyword:', err);
    }
  };

  const bug = data?.bug;
  const projectKey = (bug?.project_key || key).toUpperCase();
  const issueRef = `${projectKey}-${bug?.id || id}`;

  const totalLoggedWorkHours = (data?.comments || []).reduce(
    (sum: number, c: any) => sum + (c.work_time || 0),
    0
  );
  const elapsedFlowHours = data?.flow_metrics?.total_lead_time_ms
    ? (data.flow_metrics.total_lead_time_ms / (1000 * 60 * 60)).toFixed(1)
    : '0';

  if (isLoading) {
    return (
      <main id="main-content" className="space-y-6 font-mono max-w-7xl mx-auto p-4 sm:p-6">
        <DetailSkeleton />
      </main>
    );
  }

  if (error || !bug) {
    return (
      <main id="main-content" className="space-y-6 font-mono max-w-7xl mx-auto p-4 sm:p-6">
        <div className="p-12 text-center border border-border bg-[#0d0d0d] rounded-sm space-y-3">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto" />
          <h1 className="text-sm font-bold uppercase text-foreground">Issue Not Found</h1>
          <p className="text-xs text-muted-foreground uppercase">{error || `Could not find issue #${id}`}</p>
          <Link
            to={`/projects/${key}`}
            className="px-4 py-2 bg-foreground text-background font-bold text-xs uppercase inline-flex items-center gap-2 hover:bg-white rounded-sm mt-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>RETURN TO ISSUES LIST</span>
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main id="main-content" className="space-y-6 font-mono animate-fade-in" aria-label={`Issue ${issueRef}`}>
      {/* Top Header & Breadcrumb Bar */}
      <div className="bg-[#0d0d0d] border border-border shadow-sm rounded-sm p-5 space-y-4">
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumbs" className="flex items-center gap-2 text-xs text-muted-foreground uppercase flex-wrap">
          <Link to="/projects" className="hover:text-foreground transition-colors">
            PROJECTS
          </Link>
          <span>/</span>
          <Link to={`/projects/${projectKey}`} className="hover:text-foreground transition-colors font-bold">
            {projectKey}
          </Link>
          <span>/</span>
          <span className="text-foreground font-bold">{issueRef}</span>

          <Link
            to={`/projects/${projectKey}`}
            className="ml-auto text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>BACK TO ISSUES</span>
          </Link>
        </nav>

        {/* Title & Actions Row */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-2 border-t border-border">
          <div className="space-y-2 flex-1 min-w-[280px]">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="px-2 py-0.5 bg-foreground text-background font-bold text-xs rounded-xs">
                {issueRef}
              </span>

              {/* Status Transition Dropdown */}
              <StatusTransitionDropdown
                bugId={bug.id}
                currentStatus={bug.status}
                availableTransitions={data.available_transitions || []}
                onTransitionSuccess={loadData}
              />

              {bug.security_group_id && (
                <span className="px-2 py-0.5 bg-purple-950 text-purple-300 border border-purple-500 text-xs font-bold uppercase rounded-xs">
                  CONFIDENTIAL SECURITY
                </span>
              )}

              {/* Live Presence Viewers */}
              {data.viewers && data.viewers.length > 0 && (
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-black border border-border text-[10px] text-muted-foreground rounded-xs">
                  <span className="w-1.5 h-1.5 bg-emerald-400 animate-blink rounded-full" />
                  <span>
                    VIEWERS: <strong className="text-foreground">@{data.viewers.map((v: any) => v.username).join(', @')}</strong>
                  </span>
                </div>
              )}
            </div>

            <h1 className="text-lg sm:text-2xl font-black text-foreground uppercase tracking-tight leading-snug">
              {bug.title}
            </h1>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={handleToggleWatch}
              className={`px-3 py-1.5 text-xs uppercase font-bold border transition-all rounded-sm flex items-center gap-1.5 ${
                bug.is_watched
                  ? 'bg-foreground text-background border-foreground'
                  : 'bg-transparent text-muted-foreground border-border hover:border-foreground hover:text-foreground'
              }`}
              title={bug.is_watched ? 'Watching incident' : 'Click to watch'}
            >
              {bug.is_watched ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{bug.is_watched ? 'WATCHING' : 'WATCH'}</span>
              <span>({bug.watchers?.length || 0})</span>
            </button>

            <button
              onClick={() => exportFlowReportAsHtml(data)}
              className="px-3 py-1.5 text-xs uppercase font-bold border border-border hover:border-foreground text-foreground bg-transparent transition-all flex items-center gap-1.5 rounded-sm"
              title="Download Standalone HTML Dossier"
            >
              <Download className="w-3.5 h-3.5" />
              <span>EXPORT HTML</span>
            </button>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Main Content (Left) & Sidebar Controls (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Primary Left Column (8 cols on large screens) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Flow Timeline (with Stalled Bottlenecks) */}
          <FlowTimeline
            bug={bug}
            activity={data.activity || []}
            gitLinks={data.git_links || []}
            flowMetrics={data.flow_metrics}
            flags={data.flags || []}
            onOpenFlag={() => setActiveSideTab('flags')}
          />

          {/* Description / Reproduction Details */}
          <div className="bg-[#0d0d0d] p-5 sm:p-6 border border-border rounded-sm space-y-2">
            <h2 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              REPRODUCTION DETAILS & INCIDENT NOTES
            </h2>
            <div className="text-xs leading-relaxed text-foreground whitespace-pre-wrap pt-1 font-mono">
              {bug.description}
            </div>
          </div>

          {/* Comments and Audit Stream */}
          <div className="bg-[#0d0d0d] border border-border rounded-sm p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#ea580c]" />
                <span>ACTIVITY & AUDIT TRAIL ({data.comments?.length || 0} NOTES)</span>
              </h2>
              <span className="text-[10px] text-muted-foreground uppercase">
                TOTAL WORK LOGGED: <strong className="text-foreground">{totalLoggedWorkHours}H</strong>
              </span>
            </div>

            {/* Comments List */}
            <div className="space-y-3.5">
              {data.comments?.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground uppercase border border-dashed border-border/60 rounded-sm">
                  No comments logged on this incident yet.
                </div>
              ) : (
                data.comments.map((comment: any) => (
                  <div
                    key={comment.id}
                    className={`p-4 border rounded-sm space-y-2 transition-colors ${
                      comment.is_private
                        ? 'bg-purple-950/20 border-purple-800 text-purple-200'
                        : 'bg-[#080808] border-border'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-2">
                        <strong className="text-foreground uppercase">
                          @{comment.author?.username || comment.author?.name || 'user'}
                        </strong>
                        <span className="text-muted-foreground text-[10px]">
                          {new Date(comment.created_at).toLocaleString()}
                        </span>
                        {comment.is_private && (
                          <span className="px-1.5 py-0.2 bg-purple-950 text-purple-300 text-[9px] font-bold uppercase border border-purple-500 rounded-xs">
                            PRIVATE NOTE
                          </span>
                        )}
                      </div>

                      {comment.work_time > 0 && (
                        <span className="px-2 py-0.5 bg-[#ea580c]/15 text-[#ea580c] border border-[#ea580c] text-[10px] font-bold uppercase rounded-xs flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          <span>+{comment.work_time}H WORK</span>
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                      {comment.body}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Add Comment Form */}
            <form onSubmit={handlePostComment} className="pt-4 border-t border-border space-y-3">
              <label htmlFor="issue-comment" className="block text-[10px] font-bold text-foreground uppercase tracking-wider">
                LOG COMMENT OR WORK EFFORT
              </label>

              <textarea
                id="issue-comment"
                rows={3}
                required
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Type your notes, root cause analysis, or verification findings..."
                className="w-full p-3 bg-[#080808] border border-border focus:border-foreground text-xs text-foreground placeholder-muted-foreground outline-none rounded-sm resize-y"
              />

              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <label htmlFor="work-time-hours" className="text-[10px] text-muted-foreground uppercase font-bold">
                      LOG HOURS:
                    </label>
                    <input
                      id="work-time-hours"
                      type="number"
                      step="0.25"
                      min="0"
                      max="100"
                      placeholder="0.0"
                      value={workTime}
                      onChange={(e) => setWorkTime(e.target.value)}
                      className="w-16 px-2 py-1 bg-[#080808] border border-border text-foreground text-xs rounded-sm outline-none font-bold"
                    />
                  </div>

                  <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isPrivateComment}
                      onChange={(e) => setIsPrivateComment(e.target.checked)}
                      className="accent-[#ea580c]"
                    />
                    <span>PRIVATE (SECURITY CORE)</span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isPostingComment || !newComment.trim()}
                  className="px-4 py-2 bg-foreground text-background font-bold text-xs uppercase flex items-center gap-2 hover:bg-white transition-all rounded-sm disabled:opacity-50"
                >
                  {isPostingComment ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>POST COMMENT</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Sidebar Column (4 cols on large screens) */}
        <aside className="lg:col-span-4 space-y-6">
          {/* Metadata Card */}
          <div className="bg-[#0d0d0d] border border-border rounded-sm p-4 sm:p-5 space-y-3.5">
            <h2 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider pb-2 border-b border-border">
              INCIDENT ATTRIBUTES
            </h2>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground uppercase font-bold">REPORTER</span>
                <span className="text-foreground uppercase font-bold">@{bug.reporter?.username || 'reporter'}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground uppercase font-bold">ASSIGNEE</span>
                <span className="text-[#ea580c] uppercase font-bold">
                  {bug.assignee ? `@${bug.assignee.username}` : 'UNASSIGNED'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground uppercase font-bold">SUBSYSTEM</span>
                <span className="text-foreground uppercase font-bold">{bug.component_name || bug.component_id}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground uppercase font-bold">PRIORITY / SEVERITY</span>
                <span className="text-foreground uppercase font-bold">{bug.priority} / {bug.severity}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground uppercase font-bold">MILESTONE</span>
                <span className="px-1.5 py-0.2 bg-foreground text-background text-[10px] font-bold uppercase rounded-xs">
                  {bug.target_milestone || 'NONE'}
                </span>
              </div>
            </div>
          </div>

          {/* Time Tracking & Effort Matrix */}
          <div className="bg-[#0d0d0d] border border-border rounded-sm p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground uppercase font-bold">TIME TRACKING EFFORT</span>
              <span className="text-[10px] text-muted-foreground uppercase">
                EST: <strong className="text-foreground">{bug.estimated_time || 0}H</strong>
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2 border border-border bg-black rounded-xs">
                <span className="text-[9px] text-muted-foreground uppercase block font-bold">LOGGED</span>
                <span className="text-[#ea580c] font-bold text-sm">{totalLoggedWorkHours}H</span>
              </div>
              <div className="p-2 border border-border bg-black rounded-xs">
                <span className="text-[9px] text-muted-foreground uppercase block font-bold">REMAINING</span>
                <span className="text-foreground font-bold text-sm">{bug.remaining_time || 0}H</span>
              </div>
              <div className="p-2 border border-border bg-black rounded-xs">
                <span className="text-[9px] text-muted-foreground uppercase block font-bold">ELAPSED</span>
                <span className="text-foreground font-bold text-sm">{elapsedFlowHours}H</span>
              </div>
            </div>
          </div>

          {/* Tags & Keywords */}
          <div className="bg-[#0d0d0d] border border-border rounded-sm p-4 sm:p-5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground uppercase font-bold">TAGS & KEYWORDS</span>
              {!isAddingKeyword && (
                <button
                  onClick={() => setIsAddingKeyword(true)}
                  className="text-[10px] text-muted-foreground hover:text-foreground uppercase font-bold"
                >
                  + ADD
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {bug.keywords?.map((kw: any) => (
                <span
                  key={kw.id}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] bg-black text-foreground border border-border uppercase rounded-xs"
                >
                  #{kw.name}
                  <button
                    onClick={() => handleRemoveKeyword(kw.id)}
                    className="text-muted-foreground hover:text-red-400 ml-0.5"
                    title="Remove tag"
                  >
                    ×
                  </button>
                </span>
              ))}

              {isAddingKeyword && (
                <div className="flex items-center gap-1 mt-1">
                  <select
                    value={selectedKeywordToAdd}
                    onChange={(e) => setSelectedKeywordToAdd(e.target.value)}
                    className="bg-black border border-border text-foreground text-[10px] px-1.5 py-0.5 uppercase rounded-xs"
                  >
                    <option value="">SELECT...</option>
                    {allKeywords.map((k) => (
                      <option key={k.id} value={k.id}>{k.name.toUpperCase()}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleAddKeyword}
                    className="px-2 py-0.5 bg-foreground text-background text-[10px] font-bold uppercase rounded-xs"
                  >
                    ADD
                  </button>
                  <button
                    onClick={() => setIsAddingKeyword(false)}
                    className="text-muted-foreground hover:text-foreground text-[10px]"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Tabbed Side Panels: Flags (Requests) / Relationships / Activity */}
          <div className="bg-[#0d0d0d] border border-border rounded-sm p-4 sm:p-5 space-y-4">
            {/* Side Tabs Navigation */}
            <div className="flex items-center gap-1 border-b border-border pb-2 text-[11px] overflow-x-auto">
              <button
                onClick={() => setActiveSideTab('flags')}
                className={`px-2.5 py-1 uppercase font-bold rounded-xs transition-all ${
                  activeSideTab === 'flags'
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                FLAGS ({data.flags?.length || 0})
              </button>
              <button
                onClick={() => setActiveSideTab('relationships')}
                className={`px-2.5 py-1 uppercase font-bold rounded-xs transition-all ${
                  activeSideTab === 'relationships'
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                RELATIONS ({data.relationships?.length || 0})
              </button>
              <button
                onClick={() => setActiveSideTab('activity')}
                className={`px-2.5 py-1 uppercase font-bold rounded-xs transition-all ${
                  activeSideTab === 'activity'
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                AUDIT LOG
              </button>
            </div>

            {/* Panel Content */}
            {activeSideTab === 'flags' && (
              <FlagsPanel
                bugId={bug.id}
                flags={data.flags || []}
                onRefresh={loadData}
              />
            )}

            {activeSideTab === 'relationships' && (
              <RelationshipsPanel
                bugId={bug.id}
                relationships={data.relationships || []}
                onRefresh={loadData}
                onSelectBug={(relBugId) => navigate(`/projects/${projectKey}/issues/${relBugId}`)}
              />
            )}

            {activeSideTab === 'activity' && (
              <ActivityLogPanel activity={data.activity || []} />
            )}
          </div>
        </aside>
      </div>
    </main>
  );
};

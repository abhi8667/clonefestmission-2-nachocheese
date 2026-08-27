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
  AlertTriangle
} from 'lucide-react';
import { fetchBugDetail, addComment, sendPresenceHeartbeat } from '../../services/api.ts';
import { FlowTimeline } from './FlowTimeline.tsx';
import { StatusTransitionDropdown } from './StatusTransitionDropdown.tsx';
import { FlagsPanel } from './FlagsPanel.tsx';
import { RelationshipsPanel } from './RelationshipsPanel.tsx';
import { ActivityLogPanel } from './ActivityLogPanel.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { useSSE } from '../../context/SSEContext.tsx';

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
  const { lastEvent } = useSSE();
  const [data, setData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'comments' | 'relationships' | 'flags' | 'git' | 'activity'>('comments');
  const [newComment, setNewComment] = useState('');
  const [isPrivateComment, setIsPrivateComment] = useState(false);
  const [isPostingComment, setIsPostingComment] = useState(false);

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

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setIsPostingComment(true);
    try {
      await addComment(bugId, newComment, isPrivateComment, currentUser?.id);
      setNewComment('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to post comment');
    } finally {
      setIsPostingComment(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in" onClick={onClose}>
      <div
        className="w-full max-w-5xl bg-surface-50 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden my-6 animate-slide-up flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 lg:p-6 border-b border-slate-800 bg-surface-100/90 flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <span className="font-mono text-base font-extrabold text-primary-400">
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
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30 text-xs font-semibold">
                  <ShieldAlert className="w-3.5 h-3.5" /> Confidential Security Bug
                </span>
              )}

              {/* Live Presence Viewers */}
              {data?.viewers && data.viewers.length > 0 && (
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-[11px] text-slate-300">
                  <Users className="w-3 h-3 text-emerald-400 animate-pulse" />
                  <span>
                    Viewing now: <strong className="text-white">@{data.viewers.map((v: any) => v.username).join(', @')}</strong>
                  </span>
                </div>
              )}
            </div>

            <h2 className="text-lg lg:text-xl font-bold text-white leading-snug">
              {data?.bug?.title || 'Loading bug details...'}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        {isLoading ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            <p className="text-xs font-mono">Deriving flow metrics and loading lifecycle history...</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6">
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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-surface-100/60 p-3.5 rounded-xl border border-slate-800/80 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px]">Reporter</span>
                <span className="font-semibold text-slate-200">
                  {data?.bug?.reporter?.name || data?.bug?.reporter_id} (@{data?.bug?.reporter?.username || 'reporter'})
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Assignee</span>
                <span className="font-semibold text-slate-200">
                  {data?.bug?.assignee?.name || 'Unassigned'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Component</span>
                <span className="font-mono text-primary-300 font-bold uppercase">
                  {data?.bug?.component_id} ({data?.bug?.component_name || 'Core'})
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Severity / Priority</span>
                <span className="font-semibold text-slate-200 capitalize">
                  {data?.bug?.severity} / {data?.bug?.priority}
                </span>
              </div>
            </div>

            {/* Description */}
            <div className="bg-surface-100/50 p-4 rounded-xl border border-slate-800 text-xs leading-relaxed text-slate-300 whitespace-pre-wrap">
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Description</h4>
              {data?.bug?.description}
            </div>

            {/* Tabbed Panels */}
            <div>
              {/* Tab navigation */}
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2 mb-4">
                <button
                  onClick={() => setActiveTab('comments')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    activeTab === 'comments'
                      ? 'bg-primary-600/20 text-primary-300 border border-primary-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  Comments ({data?.comments?.length || 0})
                </button>

                <button
                  onClick={() => setActiveTab('relationships')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    activeTab === 'relationships'
                      ? 'bg-primary-600/20 text-primary-300 border border-primary-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <GitFork className="w-3.5 h-3.5" />
                  Relationships ({data?.relationships?.length || 0})
                </button>

                <button
                  onClick={() => setActiveTab('flags')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    activeTab === 'flags'
                      ? 'bg-primary-600/20 text-primary-300 border border-primary-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <FlagIcon className="w-3.5 h-3.5" />
                  Flags & Requests ({data?.flags?.length || 0})
                </button>

                <button
                  onClick={() => setActiveTab('git')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    activeTab === 'git'
                      ? 'bg-primary-600/20 text-primary-300 border border-primary-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <GitBranch className="w-3.5 h-3.5" />
                  Git Links ({data?.git_links?.length || 0})
                </button>

                <button
                  onClick={() => setActiveTab('activity')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    activeTab === 'activity'
                      ? 'bg-primary-600/20 text-primary-300 border border-primary-500/40 shadow-sm'
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
                        className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                          c.is_private
                            ? 'bg-red-950/20 border-red-900/40 text-red-200'
                            : 'bg-surface-100/70 border-slate-800/80'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-200">
                              {c.author?.name || c.author_id}
                            </span>
                            <span className="text-[10px] text-slate-500">@{c.author?.username}</span>
                            {c.is_private && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-red-400 bg-red-500/10 px-1 py-0.2 rounded">
                                <Lock className="w-2.5 h-2.5" /> Private
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] font-mono text-slate-500">
                            {new Date(c.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-slate-300 whitespace-pre-wrap leading-relaxed">{c.body}</p>
                      </div>
                    ))}

                    {(!data?.comments || data.comments.length === 0) && (
                      <div className="p-8 text-center text-slate-500 text-xs italic bg-surface-50/40 rounded-xl border border-slate-800/40">
                        No comments yet on this report.
                      </div>
                    )}
                  </div>

                  {/* Add comment form */}
                  <form onSubmit={handlePostComment} className="p-3.5 rounded-xl bg-surface-100 border border-slate-700/80 space-y-2.5">
                    <textarea
                      rows={3}
                      placeholder="Write a comment..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="w-full bg-surface-50 border border-slate-700 rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-primary-500"
                    />

                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isPrivateComment}
                          onChange={(e) => setIsPrivateComment(e.target.checked)}
                          className="rounded bg-slate-900 border-slate-700 text-primary-600 focus:ring-0"
                        />
                        <span>Private comment (visible only to members)</span>
                      </label>

                      <button
                        type="submit"
                        disabled={isPostingComment || !newComment.trim()}
                        className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-primary-600 hover:bg-primary-500 shadow-glow-primary flex items-center gap-1.5 disabled:opacity-50 transition-all"
                      >
                        {isPostingComment ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                        <span>Post Comment</span>
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
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Connected Git Artifacts (Branches, Commits, PRs)
                    </h4>
                  </div>

                  <div className="space-y-2">
                    {data?.git_links?.map((g: any) => (
                      <div
                        key={g.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-surface-100/70 border border-slate-800/80 text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-cyan-300 border border-slate-700">
                            {g.kind}
                          </span>
                          <div>
                            <span className="font-mono font-semibold text-slate-200">{g.ref}</span>
                            <p className="text-[10px] text-slate-500 font-mono">State: {g.state}</p>
                          </div>
                        </div>

                        <a
                          href={g.url}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 flex items-center gap-1 transition-all"
                        >
                          <span>Open</span>
                          <ExternalLink className="w-3 h-3 text-slate-500" />
                        </a>
                      </div>
                    ))}

                    {(!data?.git_links || data.git_links.length === 0) && (
                      <div className="p-8 text-center text-slate-500 text-xs italic bg-surface-50/40 rounded-xl border border-slate-800/40">
                        No git branches or pull requests linked yet. Use git commit message 'Fixes #{data.bug.id}' or simulate webhook.
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

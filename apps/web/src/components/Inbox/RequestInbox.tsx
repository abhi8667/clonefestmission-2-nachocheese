import React, { useState, useEffect } from 'react';
import { Flag } from '@triarc/shared-types';
import {
  Inbox as InboxIcon,
  CheckCircle2,
  XCircle,
  MessageSquare,
  ArrowRight,
  Clock,
  Send,
  Loader2,
  Check,
  X
} from 'lucide-react';
import { fetchInbox, resolveFlag } from '../../services/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { useSSE } from '../../context/SSEContext.tsx';
import { TableSkeleton } from '../Common/LoadingSkeleton.tsx';
import { EmptyState } from '../Common/EmptyState.tsx';

interface RequestInboxProps {
  onSelectBug: (bugId: number) => void;
}

export const RequestInbox: React.FC<RequestInboxProps> = ({ onSelectBug }) => {
  const { currentUser } = useAuth();
  const { lastEvent } = useSSE();
  const [activeTab, setActiveTab] = useState<'incoming' | 'outgoing' | 'resolved'>('incoming');
  const [data, setData] = useState<{
    incoming: Flag[];
    outgoing: Flag[];
    resolved: Flag[];
    counts: { incoming: number; outgoing: number };
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [replyingFlagId, setReplyingFlagId] = useState<number | null>(null);
  const [replyComment, setReplyComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadInbox = () => {
    fetchInbox(currentUser?.id)
      .then((res) => {
        setData(res);
      })
      .catch((err) => {
        console.error('Failed to load inbox:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    setIsLoading(true);
    loadInbox();
  }, [currentUser?.id]);

  useEffect(() => {
    if (lastEvent?.type === 'flag:created' || lastEvent?.type === 'flag:resolved') {
      loadInbox();
    }
  }, [lastEvent]);

  const handleResolve = async (flagId: number, status: '+' | '-', comment?: string) => {
    setIsSubmitting(true);
    try {
      await resolveFlag(flagId, { status, comment }, currentUser?.id);
      setReplyingFlagId(null);
      setReplyComment('');
      loadInbox();
    } catch (err: any) {
      alert(err.message || 'Failed to resolve flag');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case '?': return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case '+': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case '-': return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      default: return 'bg-slate-800 text-slate-400';
    }
  };

  const items = activeTab === 'incoming' ? (data?.incoming || []) : activeTab === 'outgoing' ? (data?.outgoing || []) : (data?.resolved || []);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface-50/80 p-5 rounded-2xl border border-slate-800/80 shadow-xl">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <InboxIcon className="w-5 h-5 text-primary-400" />
            Request & Approval Inbox
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Bugzilla flags reimagined: Personal queue of who is waiting on you and who you are waiting on.
          </p>
        </div>

        {/* Tab switchers */}
        <div className="flex items-center bg-surface-100 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('incoming')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'incoming'
                ? 'bg-primary-600 text-white shadow-glow-primary'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>Incoming</span>
            {data?.counts?.incoming ? (
              <span className="px-1.5 py-0.2 rounded-full bg-accent-amber text-slate-950 text-[10px]">
                {data.counts.incoming}
              </span>
            ) : null}
          </button>

          <button
            onClick={() => setActiveTab('outgoing')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'outgoing'
                ? 'bg-primary-600 text-white shadow-glow-primary'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>Outgoing</span>
            {data?.counts?.outgoing ? (
              <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 text-[10px]">
                {data.counts.outgoing}
              </span>
            ) : null}
          </button>

          <button
            onClick={() => setActiveTab('resolved')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'resolved'
                ? 'bg-primary-600 text-white shadow-glow-primary'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            History
          </button>
        </div>
      </div>

      {/* Inbox Items List */}
      {isLoading ? (
        <TableSkeleton rows={5} />
      ) : (
        <div className="space-y-3">
          {items.map((flag) => {
            const isReplying = replyingFlagId === flag.id;

            return (
              <div
                key={flag.id}
                className="p-4 rounded-2xl bg-surface-50/90 border border-slate-800 hover:border-slate-700/80 shadow-lg space-y-3 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center font-mono font-bold text-xs border shrink-0 mt-0.5 ${getStatusColor(flag.status)}`}>
                      {flag.status}
                    </span>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-xs text-primary-300 bg-primary-950/60 px-1.5 py-0.5 rounded border border-primary-800">
                          {flag.type_name}
                        </span>

                        <span
                          onClick={() => onSelectBug(flag.bug_id)}
                          className="font-mono font-bold text-xs text-primary-400 hover:underline cursor-pointer"
                        >
                          #{flag.bug_id}
                        </span>

                        <span className="text-xs font-semibold text-white">
                          {flag.bug_title || 'Bug report'}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                        <span>
                          from <strong className="text-slate-300">@{flag.setter?.username || flag.setter_id}</strong>
                        </span>
                        {flag.requestee && (
                          <span>
                            assigned to <strong className="text-primary-300">@{flag.requestee.username}</strong>
                          </span>
                        )}
                        <span>•</span>
                        <span className="font-mono text-[10px] text-slate-500">
                          {new Date(flag.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Area: One-click Inline Resolution (§5 Mockup) */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {flag.status === '?' && activeTab === 'incoming' && (
                      <>
                        {flag.type_name === 'review?' || flag.type_name === 'approval?' ? (
                          <>
                            <button
                              onClick={() => handleResolve(flag.id, '+')}
                              disabled={isSubmitting}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-300 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 flex items-center gap-1.5 shadow-sm transition-all transform active:scale-95"
                            >
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                              <span>+ Approve</span>
                            </button>

                            <button
                              onClick={() => handleResolve(flag.id, '-')}
                              disabled={isSubmitting}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold text-rose-300 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 flex items-center gap-1.5 shadow-sm transition-all transform active:scale-95"
                            >
                              <X className="w-3.5 h-3.5 stroke-[3]" />
                              <span>- Request Changes</span>
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => setReplyingFlagId(isReplying ? null : flag.id)}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold text-primary-300 bg-primary-600/20 hover:bg-primary-600/30 border border-primary-500/40 flex items-center gap-1.5 shadow-sm transition-all"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Reply Info</span>
                          </button>
                        )}
                      </>
                    )}

                    <button
                      onClick={() => onSelectBug(flag.bug_id)}
                      className="px-2.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white bg-surface-100 hover:bg-surface-200 border border-slate-700/80 flex items-center gap-1 transition-all"
                    >
                      <span>Open Bug</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Inline Reply Form for needinfo? */}
                {isReplying && (
                  <div className="pt-2 border-t border-slate-800 space-y-2 animate-slide-up">
                    <textarea
                      rows={2}
                      placeholder="Provide the requested information to resolve this needinfo? request..."
                      value={replyComment}
                      onChange={(e) => setReplyComment(e.target.value)}
                      className="w-full bg-surface-100 border border-slate-700 rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-primary-500"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setReplyingFlagId(null)}
                        className="px-3 py-1 text-xs text-slate-400 hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleResolve(flag.id, '+', replyComment)}
                        disabled={isSubmitting || !replyComment.trim()}
                        className="px-3.5 py-1 text-xs font-bold text-white bg-primary-600 hover:bg-primary-500 rounded-lg shadow-glow-primary flex items-center gap-1 disabled:opacity-50"
                      >
                        {isSubmitting && <Loader2 className="w-3 h-3 animate-spin" />}
                        <span>Submit & Mark Answered (+)</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {items.length === 0 && (
            <EmptyState
              icon={InboxIcon}
              title={`No ${activeTab} requests`}
              description={
                activeTab === 'incoming'
                  ? 'Your queue is all clear! No pending review?, approval?, or needinfo? flags are waiting on your action.'
                  : activeTab === 'outgoing'
                  ? 'You have no outstanding requests waiting on other team members.'
                  : 'No request history recorded yet.'
              }
            />
          )}
        </div>
      )}
    </div>
  );
};

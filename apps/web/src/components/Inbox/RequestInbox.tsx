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
  X,
  ShieldCheck,
  ShieldAlert,
  Radio,
  Lock
} from 'lucide-react';
import { fetchInbox, resolveFlag } from '../../services/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { useSSE } from '../../context/SSEContext.tsx';
import { TableSkeleton } from '../Common/LoadingSkeleton.tsx';
import { EmptyState } from '../Common/EmptyState.tsx';
import { AnimatedCounter } from '../Cyber/AnimatedCounter.tsx';

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
      case '?':
        return 'bg-amber-950/80 text-amber-300 border-amber-500/50 shadow-glow-amber';
      case '+':
        return 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50 shadow-glow-neon';
      case '-':
        return 'bg-red-950/80 text-red-300 border-red-500/50 shadow-glow-red';
      default:
        return 'bg-slate-900 text-slate-400 border-slate-700';
    }
  };

  const items =
    activeTab === 'incoming'
      ? data?.incoming || []
      : activeTab === 'outgoing'
      ? data?.outgoing || []
      : data?.resolved || [];

  return (
    <div className="space-y-6">
      {/* Top Header Console */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-950/90 p-5 rounded-2xl border border-cyan-500/20 shadow-cyber-card backdrop-blur-xl cyber-corners">
        <div className="space-y-1">
          <h2 className="text-xl font-bold font-mono text-white flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <InboxIcon className="w-5 h-5" />
            </div>
            <span>CLEARANCE & APPROVAL INBOX</span>
          </h2>
          <p className="text-xs font-mono text-slate-400">
            Permissioned review flags & authorization queue. Zero unmonitored review bottlenecks.
          </p>
        </div>

        {/* Tab Switcher HUD */}
        <div className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-800 self-start sm:self-auto font-mono text-xs">
          <button
            onClick={() => setActiveTab('incoming')}
            className={`px-4 py-1.5 rounded-lg font-bold transition-all flex items-center gap-2 ${
              activeTab === 'incoming'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-glow-cyan'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>Incoming</span>
            {data?.counts?.incoming ? (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 font-bold text-[10px] animate-pulse">
                <AnimatedCounter value={data.counts.incoming} />
              </span>
            ) : null}
          </button>

          <button
            onClick={() => setActiveTab('outgoing')}
            className={`px-4 py-1.5 rounded-lg font-bold transition-all flex items-center gap-2 ${
              activeTab === 'outgoing'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-glow-cyan'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>Outgoing</span>
            {data?.counts?.outgoing ? (
              <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-cyan-300 text-[10px]">
                <AnimatedCounter value={data.counts.outgoing} />
              </span>
            ) : null}
          </button>

          <button
            onClick={() => setActiveTab('resolved')}
            className={`px-4 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'resolved'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-glow-cyan'
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
      ) : items.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title={activeTab === 'incoming' ? 'Zero Pending Incoming Flags' : 'No Outgoing Authorization Requests'}
          description="Your clearance queue is clear. All review items and approval flags have been processed."
        />
      ) : (
        <div className="space-y-3">
          {items.map((flag) => {
            const isReplying = replyingFlagId === flag.id;

            return (
              <div
                key={flag.id}
                className="p-4 rounded-2xl bg-slate-950/80 border border-cyan-500/15 hover:border-cyan-500/40 shadow-cyber-card space-y-3 transition-all cyber-corners"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-mono font-bold text-xs border shrink-0 mt-0.5 ${getStatusColor(
                        flag.status
                      )}`}
                    >
                      {flag.status}
                    </span>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-xs text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded-md border border-cyan-800/60">
                          {flag.type_name}
                        </span>

                        <span
                          onClick={() => onSelectBug(flag.bug_id)}
                          className="font-mono font-bold text-xs text-cyan-400 hover:underline cursor-pointer"
                        >
                          #{flag.bug_id}
                        </span>

                        <span className="text-xs font-semibold text-white">
                          {flag.bug_title || 'Incident Report'}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400 mt-1">
                        <span>
                          Requested by <strong className="text-slate-200">@{flag.setter?.username || flag.setter_id}</strong>
                        </span>
                        {flag.requestee && (
                          <span>
                            assigned to <strong className="text-cyan-300">@{flag.requestee.username}</strong>
                          </span>
                        )}
                        <span>•</span>
                        <span className="text-[10px] text-slate-500">
                          {new Date(flag.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions for pending items */}
                  {flag.status === '?' && activeTab === 'incoming' && (
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      {!isReplying ? (
                        <>
                          <button
                            onClick={() => setReplyingFlagId(flag.id)}
                            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-xs font-mono transition-colors"
                          >
                            Add Note
                          </button>
                          <button
                            onClick={() => handleResolve(flag.id, '+')}
                            disabled={isSubmitting}
                            className="cyber-btn-neon !py-1.5 !px-3"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Grant (+)</span>
                          </button>
                          <button
                            onClick={() => handleResolve(flag.id, '-')}
                            disabled={isSubmitting}
                            className="cyber-btn-danger !py-1.5 !px-3"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Reject (-)</span>
                          </button>
                        </>
                      ) : null}
                    </div>
                  )}
                </div>

                {/* Reply Form */}
                {isReplying && (
                  <div className="mt-3 pt-3 border-t border-slate-800 space-y-2 animate-slide-up">
                    <textarea
                      value={replyComment}
                      onChange={(e) => setReplyComment(e.target.value)}
                      placeholder="Enter cryptographic justification / review comment..."
                      rows={2}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setReplyingFlagId(null)}
                        className="px-3 py-1.5 rounded-xl bg-slate-900 text-slate-400 hover:text-white text-xs font-mono"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleResolve(flag.id, '+', replyComment)}
                        disabled={isSubmitting}
                        className="cyber-btn-neon !py-1.5 !px-3"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Grant with Note</span>
                      </button>
                      <button
                        onClick={() => handleResolve(flag.id, '-', replyComment)}
                        disabled={isSubmitting}
                        className="cyber-btn-danger !py-1.5 !px-3"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Reject with Note</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

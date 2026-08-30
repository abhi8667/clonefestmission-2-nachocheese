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
    total_pending: number;
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case '?':
        return 'bg-[#B497CF] text-background font-bold animate-blink';
      case '+':
        return 'bg-emerald-600 text-black font-bold';
      case '-':
        return 'bg-red-600 text-white font-bold';
      default:
        return 'bg-black text-muted-foreground border-border';
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
      {/* Section Taxonomy */}
      <div className="flex items-center gap-4">
        <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-mono">
          // SECTION: CLEARANCE_QUEUE
        </span>
        <div className="flex-1 border-t border-border"></div>
        <span className="inline-block h-2 w-2 bg-[#B497CF] animate-blink"></span>
        <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-mono">
          002
        </span>
      </div>

      {/* Top Header Console */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0d0d0d] p-4 border-2 border-foreground shadow-brutalist">
        <div className="space-y-1">
          <h2 className="text-base font-bold font-mono text-foreground uppercase tracking-wider flex items-center gap-2">
            <div className="w-6 h-6 bg-foreground text-background flex items-center justify-center font-bold">
              <InboxIcon className="w-3.5 h-3.5 text-background" />
            </div>
            <span>// CLEARANCE & APPROVAL INBOX</span>
          </h2>
          <p className="text-xs font-mono text-muted-foreground uppercase">
            PERMISSIONED REVIEW FLAGS & TWO-WAY QUEUE. ZERO BOTTLENECKS.
          </p>
        </div>

        {/* Tab Switcher HUD */}
        <div className="flex items-center border-2 border-foreground/30 bg-[#080808] self-start sm:self-auto font-mono text-xs">
          <button
            onClick={() => setActiveTab('incoming')}
            className={`px-3 py-1 font-bold uppercase transition-all flex items-center gap-1.5 ${activeTab === 'incoming'
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:text-foreground'
              }`}
          >
            <span>INCOMING</span>
            {data?.incoming?.length ? (
              <span className="px-1.5 py-0.2 bg-[#B497CF] text-background text-[9px] font-bold animate-blink">
                <AnimatedCounter value={data.incoming.length} />
              </span>
            ) : null}
          </button>

          <button
            onClick={() => setActiveTab('outgoing')}
            className={`px-3 py-1 font-bold uppercase transition-all flex items-center gap-1.5 border-l border-border ${activeTab === 'outgoing'
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:text-foreground'
              }`}
          >
            <span>OUTGOING</span>
            {data?.outgoing?.length ? (
              <span className="px-1.5 py-0.2 bg-[#222] text-foreground text-[9px]">
                <AnimatedCounter value={data.outgoing.length} />
              </span>
            ) : null}
          </button>

          <button
            onClick={() => setActiveTab('resolved')}
            className={`px-3 py-1 font-bold uppercase transition-all border-l border-border ${activeTab === 'resolved'
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:text-foreground'
              }`}
          >
            HISTORY
          </button>
        </div>
      </div>

      {/* Inbox Items List */}
      {isLoading ? (
        <TableSkeleton rows={5} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title={activeTab === 'incoming' ? 'ZERO PENDING INCOMING FLAGS' : 'NO OUTGOING REQUESTS'}
          description="Your clearance queue is clear. All review items and approval flags have been processed."
        />
      ) : (
        <div className="space-y-2">
          {items.map((flag) => {
            const isReplying = replyingFlagId === flag.id;

            return (
              <div
                key={flag.id}
                className="p-3.5 bg-[#0d0d0d] border-2 border-border hover:border-foreground shadow-brutalist space-y-2.5 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span
                      className={`w-6 h-6 flex items-center justify-center font-mono font-bold text-xs shrink-0 mt-0.5 ${getStatusBadge(
                        flag.status
                      )}`}
                    >
                      {flag.status}
                    </span>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap font-mono">
                        <span className="font-bold text-xs bg-foreground text-background px-1.5 py-0.2 uppercase">
                          {flag.type_name}
                        </span>

                        <span
                          onClick={() => onSelectBug(flag.bug_id)}
                          className="font-bold text-xs text-[#B497CF] hover:underline cursor-pointer"
                        >
                          #{flag.bug_id}
                        </span>

                        <span className="text-xs font-bold text-foreground uppercase">
                          {flag.bug_title || 'INCIDENT REPORT'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground mt-1 uppercase">
                        <span>
                          REQUESTED BY <strong className="text-foreground">@{flag.setter?.username || flag.setter_id}</strong>
                        </span>
                        {flag.requestee && (
                          <span>
                            → ASSIGNED TO <strong className="text-[#B497CF]">@{flag.requestee.username}</strong>
                          </span>
                        )}
                        <span>•</span>
                        <span>
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
                            className="px-2.5 py-1 bg-[#141414] hover:bg-[#222] border border-border text-xs font-mono uppercase text-muted-foreground hover:text-foreground"
                          >
                            NOTE
                          </button>
                          <button
                            onClick={() => handleResolve(flag.id, '+')}
                            disabled={isSubmitting}
                            className="px-3 py-1 bg-foreground text-background font-bold text-xs font-mono uppercase hover:bg-white flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>[+] APPROVE</span>
                          </button>
                          <button
                            onClick={() => handleResolve(flag.id, '-')}
                            disabled={isSubmitting}
                            className="px-3 py-1 bg-red-950 border border-red-500 text-red-300 font-bold text-xs font-mono uppercase hover:bg-red-900 flex items-center gap-1"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>[-] REJECT</span>
                          </button>
                        </>
                      ) : null}
                    </div>
                  )}
                </div>

                {/* Reply Form */}
                {isReplying && (
                  <div className="mt-2 pt-2 border-t border-border space-y-2 animate-slide-up">
                    <textarea
                      value={replyComment}
                      onChange={(e) => setReplyComment(e.target.value)}
                      placeholder="ENTER CLEARANCE JUSTIFICATION NOTE..."
                      rows={2}
                      className="w-full bg-[#080808] border-2 border-border p-2 text-xs font-mono text-foreground placeholder-muted-foreground focus:outline-none focus:border-foreground uppercase"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setReplyingFlagId(null)}
                        className="px-2.5 py-1 bg-[#141414] border border-border text-muted-foreground hover:text-foreground text-xs font-mono uppercase"
                      >
                        CANCEL
                      </button>
                      <button
                        onClick={() => handleResolve(flag.id, '+', replyComment)}
                        disabled={isSubmitting}
                        className="px-3 py-1 bg-foreground text-background font-bold text-xs font-mono uppercase hover:bg-white"
                      >
                        [+] GRANT
                      </button>
                      <button
                        onClick={() => handleResolve(flag.id, '-', replyComment)}
                        disabled={isSubmitting}
                        className="px-3 py-1 bg-red-950 border border-red-500 text-red-300 font-bold text-xs font-mono uppercase hover:bg-red-900"
                      >
                        [-] REJECT
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

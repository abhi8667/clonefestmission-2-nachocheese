import React, { useState, useEffect } from 'react';
import { Mail, ArrowRight, X, Sparkles, MessageSquare, Flag, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { fetchDigest } from '../../services/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { DigestSummary } from '@triarc/shared-types';

interface DigestBannerProps {
  onSelectBug?: (bugId: number) => void;
}

export const DigestBanner: React.FC<DigestBannerProps> = ({ onSelectBug }) => {
  const { currentUser } = useAuth();
  const [digest, setDigest] = useState<DigestSummary | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Reset dismiss status when switching user
    setIsDismissed(false);
    setIsExpanded(false);
    setIsLoading(true);

    fetchDigest(undefined, currentUser?.id)
      .then((res) => {
        setDigest(res);
      })
      .catch((err) => {
        console.error('Failed to load digest:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [currentUser?.id]);

  if (isDismissed || !digest || digest.total_events === 0) {
    return null;
  }

  return (
    <div className="mb-6 rounded-2xl bg-gradient-to-r from-primary-950/70 via-surface-100/90 to-surface-50/90 border border-primary-500/40 p-4 shadow-xl backdrop-blur-md animate-fade-in transition-all">
      <div className="flex items-start sm:items-center justify-between gap-4 flex-wrap sm:flex-nowrap">
        {/* Left: Icon + Summary title */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary-600/30 border border-primary-400/50 flex items-center justify-center text-primary-300 shadow-glow-primary shrink-0">
            <Mail className="w-4 h-4 text-primary-300 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-white tracking-wide flex items-center gap-1.5">
                <span>Since You Were Away ({digest.period_label})</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-primary-500/20 text-primary-300 border border-primary-500/30">
                  {digest.total_events} updates
                </span>
              </h3>
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5 flex items-center gap-2 flex-wrap">
              <span><strong>{digest.status_changes_count}</strong> status changes</span>
              <span>·</span>
              <span><strong>{digest.new_flags_count}</strong> new flags</span>
              <span>·</span>
              <span><strong>{digest.comments_count}</strong> comments</span>
            </p>
          </div>
        </div>

        {/* Right: Expand Details & Dismiss */}
        <div className="flex items-center gap-2 ml-auto sm:ml-0">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-2.5 py-1.5 rounded-lg bg-surface-200/80 hover:bg-surface-200 border border-slate-700/80 hover:border-slate-600 text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition-all"
          >
            <span>{isExpanded ? 'Hide Details' : 'View Changes'}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={() => setIsDismissed(true)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-800/40 hover:bg-slate-800 border border-slate-700/40 transition-all"
            title="Dismiss digest"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Collapsible Details Grid */}
      {isExpanded && digest.items && digest.items.length > 0 && (
        <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2 animate-slide-up">
          <h4 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            Key Changes Since Last Visit:
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {digest.items.map((item) => (
              <div
                key={item.id}
                onClick={() => onSelectBug && onSelectBug(item.bug_id)}
                className="p-2.5 rounded-xl bg-surface-200/50 hover:bg-surface-200/80 border border-slate-800 hover:border-slate-700 flex items-center justify-between gap-3 text-xs cursor-pointer group transition-all"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-primary-400 font-bold text-[11px]">#{item.bug_id}</span>
                    <span className="font-medium text-slate-200 truncate">{item.bug_title}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {item.field === 'status' ? (
                      <span>Status moved to <strong className="text-emerald-400">{item.new_value}</strong></span>
                    ) : item.field === 'comment' ? (
                      <span>New comment by {item.actor_name || 'team'}</span>
                    ) : (
                      <span>Flag updated ({item.field})</span>
                    )}
                  </p>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-primary-400 group-hover:translate-x-0.5 transition-all shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

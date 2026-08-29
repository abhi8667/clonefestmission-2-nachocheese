import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ArrowRight,
  X,
  Sparkles,
  MessageSquare,
  Flag,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Activity,
  Radio
} from 'lucide-react';
import { fetchDigest } from '../../services/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { DigestSummary, DigestItem } from '@triarc/shared-types';
import { AnimatedCounter } from '../Cyber/AnimatedCounter.tsx';

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
    <div className="mb-6 bg-[#0d0d0d] border-2 border-foreground/30 p-4 shadow-brutalist animate-fade-in transition-all">
      <div className="flex items-start sm:items-center justify-between gap-4 flex-wrap sm:flex-nowrap">
        {/* Left: Icon + Intelligence Briefing */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-foreground text-background flex items-center justify-center font-mono font-bold shrink-0">
            <Radio className="w-4 h-4 text-background" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold font-mono text-foreground uppercase tracking-wider flex items-center gap-2">
                <span>// THREAT BRIEFING: SINCE LAST LOGIN ({digest.period_label.toUpperCase()})</span>
                <span className="px-1.5 py-0.2 text-[10px] font-mono font-bold bg-[#ea580c] text-background">
                  <AnimatedCounter value={digest.total_events} /> EVENTS
                </span>
              </h3>
            </div>
            <p className="text-[11px] font-mono text-muted-foreground mt-1 flex items-center gap-2 flex-wrap uppercase">
              <span className="text-foreground">
                <strong><AnimatedCounter value={digest.status_changes_count} /></strong> TRANSITIONS
              </span>
              <span>·</span>
              <span className="text-[#ea580c]">
                <strong><AnimatedCounter value={digest.new_flags_count} /></strong> REVIEW FLAGS
              </span>
              <span>·</span>
              <span className="text-foreground">
                <strong><AnimatedCounter value={digest.comments_count} /></strong> AUDIT LOGS
              </span>
            </p>
          </div>
        </div>

        {/* Right: Expand Details & Dismiss */}
        <div className="flex items-center gap-2 ml-auto sm:ml-0">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-3 py-1 bg-[#141414] hover:bg-foreground hover:text-background border-2 border-border text-xs font-mono uppercase font-bold flex items-center gap-1.5 transition-all"
          >
            <span>{isExpanded ? 'COLLAPSE' : 'EXPAND'}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={() => setIsDismissed(true)}
            className="p-1 border-2 border-border hover:border-foreground text-muted-foreground hover:text-foreground bg-[#141414] transition-all"
            title="Acknowledge & dismiss briefing"
            aria-label="Dismiss intelligence briefing"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Expanded Briefing Drawer */}
      {isExpanded && (
        <div className="mt-4 pt-3 border-t-2 border-border space-y-2 text-xs font-mono">
          <h4 className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">
            // RECENT AUDIT TRAIL LOGS ({digest.items.length})
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {digest.items.slice(0, 8).map((item: DigestItem) => (
              <div
                key={item.id}
                onClick={() => onSelectBug && onSelectBug(item.bug_id)}
                className="p-2 border border-border hover:border-foreground bg-[#111] cursor-pointer flex items-center justify-between transition-all"
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="font-bold text-[#ea580c]">#{item.bug_id}</span>
                  <span className="truncate text-foreground font-medium uppercase">{item.bug_title}</span>
                </div>
                <span className="px-1.5 py-0.2 text-[9px] bg-black text-muted-foreground border border-border uppercase shrink-0">
                  {item.field}: {item.new_value || 'UPDATED'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

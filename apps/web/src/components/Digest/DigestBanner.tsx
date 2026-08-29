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
import { DigestSummary } from '@triarc/shared-types';
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
    <div className="mb-6 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-950/40 border border-cyan-500/30 p-4 shadow-cyber-card backdrop-blur-xl animate-fade-in transition-all cyber-corners">
      <div className="flex items-start sm:items-center justify-between gap-4 flex-wrap sm:flex-nowrap">
        {/* Left: Icon + Intelligence Briefing */}
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-500/50 flex items-center justify-center text-cyan-300 shadow-glow-cyan shrink-0">
            <Radio className="w-5 h-5 text-cyan-400 animate-pulse" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-glow-cyan animate-ping" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold font-mono text-white tracking-wide flex items-center gap-2">
                <span>THREAT BRIEFING: SINCE LAST LOGIN ({digest.period_label.toUpperCase()})</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm">
                  <AnimatedCounter value={digest.total_events} /> telemetry events
                </span>
              </h3>
            </div>
            <p className="text-[11px] font-mono text-slate-300 mt-1 flex items-center gap-2 flex-wrap">
              <span className="text-cyan-300">
                <strong><AnimatedCounter value={digest.status_changes_count} /></strong> transitions
              </span>
              <span className="text-slate-600">·</span>
              <span className="text-amber-300">
                <strong><AnimatedCounter value={digest.new_flags_count} /></strong> review flags
              </span>
              <span className="text-slate-600">·</span>
              <span className="text-emerald-300">
                <strong><AnimatedCounter value={digest.comments_count} /></strong> security notes
              </span>
            </p>
          </div>
        </div>

        {/* Right: Expand Details & Dismiss */}
        <div className="flex items-center gap-2 ml-auto sm:ml-0">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 hover:border-cyan-500/40 text-xs font-mono font-semibold text-cyan-300 flex items-center gap-1.5 transition-all shadow-sm"
          >
            <span>{isExpanded ? 'Collapse Intel' : 'Expand Intel'}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={() => setIsDismissed(true)}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-all"
            title="Acknowledge & dismiss briefing"
            aria-label="Dismiss intelligence briefing"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Collapsible Details Grid */}
      {isExpanded && digest.items && digest.items.length > 0 && (
        <div className="mt-4 pt-3 border-t border-slate-800/90 space-y-2.5 animate-slide-up">
          <h4 className="text-[10px] uppercase font-mono font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span>Telemetry Timeline Items:</span>
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {digest.items.map((item) => (
              <div
                key={item.id}
                onClick={() => onSelectBug && onSelectBug(item.bug_id)}
                className="p-3 rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-slate-800/80 hover:border-cyan-500/40 flex items-center justify-between gap-3 text-xs cursor-pointer group transition-all"
              >
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-cyan-400 font-bold text-[11px]">#{item.bug_id}</span>
                    <span className="font-medium text-slate-200 truncate">{item.bug_title}</span>
                  </div>
                  <p className="text-[10px] font-mono text-slate-400">
                    {item.field === 'status' ? (
                      <span>Status changed: <strong className="text-emerald-400">{item.old_value || 'None'} → {item.new_value}</strong></span>
                    ) : item.field === 'comment' ? (
                      <span>New security comment by <strong className="text-slate-300">{item.actor_name || 'operator'}</strong></span>
                    ) : (
                      <span>Flag updated: <strong className="text-amber-400">{item.field}</strong></span>
                    )}
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

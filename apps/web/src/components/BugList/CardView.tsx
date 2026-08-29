import React from 'react';
import { Bug, BugStatus } from '@triarc/shared-types';
import { AlertTriangle, MessageSquare, ShieldAlert, Radio, Activity } from 'lucide-react';
import { AnimatedCounter } from '../Cyber/AnimatedCounter.tsx';

interface CardViewProps {
  bugs: Bug[];
  onSelectBug: (bugId: number) => void;
}

export const CardView: React.FC<CardViewProps> = ({ bugs, onSelectBug }) => {
  const columns: { status: BugStatus; label: string; color: string; bgGlow: string }[] = [
    { status: 'Unconfirmed', label: 'Unconfirmed', color: 'border-slate-600', bgGlow: 'bg-slate-950/80' },
    { status: 'Confirmed', label: 'Confirmed', color: 'border-cyan-500', bgGlow: 'bg-cyan-950/20' },
    { status: 'In Progress', label: 'In Progress', color: 'border-amber-500', bgGlow: 'bg-amber-950/20' },
    { status: 'In Review', label: 'In Review', color: 'border-purple-500', bgGlow: 'bg-purple-950/20' },
    { status: 'Resolved', label: 'Resolved (FIXED)', color: 'border-emerald-500', bgGlow: 'bg-emerald-950/20' },
    { status: 'Verified', label: 'Verified', color: 'border-teal-500', bgGlow: 'bg-teal-950/20' }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5 pb-6 overflow-x-auto">
      {columns.map((col) => {
        const columnBugs = bugs.filter((b) => b.status === col.status);
        return (
          <div
            key={col.status}
            className="flex flex-col bg-slate-950/80 rounded-2xl border border-cyan-500/15 p-3 min-w-[210px] shadow-cyber-card backdrop-blur-xl cyber-corners"
          >
            {/* Column Header */}
            <div className={`flex items-center justify-between pb-2 mb-2.5 border-b-2 ${col.color}`}>
              <span className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">{col.label}</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-900 text-cyan-300 border border-slate-800 font-bold">
                <AnimatedCounter value={columnBugs.length} />
              </span>
            </div>

            {/* Column Cards */}
            <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[680px] pr-0.5">
              {columnBugs.map((bug) => {
                const isBug412Stalled = bug.id === 412 && bug.status === 'In Review';
                const isConfidential = Boolean(bug.security_group_id);

                return (
                  <div
                    key={bug.id}
                    onClick={() => onSelectBug(bug.id)}
                    className={`p-3 rounded-xl bg-slate-900/90 hover:bg-slate-850 border border-slate-800 hover:border-cyan-500/50 cursor-pointer shadow-sm transition-all transform hover:-translate-y-1 ${
                      isBug412Stalled
                        ? 'border-red-500/60 bg-red-950/30 shadow-glow-red'
                        : isConfidential
                        ? 'border-purple-500/50 bg-purple-950/20 shadow-glow-purple'
                        : ''
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        {isConfidential && <ShieldAlert className="w-3 h-3 text-purple-400 shrink-0" />}
                        <span className="font-mono font-bold text-xs text-cyan-400">#{bug.id}</span>
                      </div>
                      <span className="text-[9px] font-mono text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                        {bug.component_id}
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-slate-200 line-clamp-2 mb-2 leading-snug">
                      {bug.title}
                    </p>

                    {isBug412Stalled && (
                      <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-red-300 bg-red-950/80 px-2 py-0.5 rounded border border-red-500/60 mb-2 animate-pulse shadow-glow-red">
                        <AlertTriangle className="w-3 h-3 text-red-400" />
                        STALLED (4d in review)
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1.5 border-t border-slate-800/80">
                      <div className="flex items-center gap-1.5">
                        {bug.assignee ? (
                          <span className="text-[10px] font-mono text-slate-300 font-medium truncate max-w-[90px]">
                            {bug.assignee.name}
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono text-slate-500 italic">Unassigned</span>
                        )}
                      </div>

                      {bug.comments_count ? (
                        <span className="flex items-center gap-1 text-[10px] font-mono text-cyan-400">
                          <MessageSquare className="w-3 h-3 text-slate-500" />
                          {bug.comments_count}
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })}

              {columnBugs.length === 0 && (
                <div className="p-6 text-center text-slate-600 text-xs font-mono italic">
                  NO INCIDENTS
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

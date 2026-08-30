import React from 'react';
import { Bug, BugStatus } from '@triarc/shared-types';
import { AlertTriangle, MessageSquare, ShieldAlert, Radio, Activity } from 'lucide-react';
import { AnimatedCounter } from '../Cyber/AnimatedCounter.tsx';

interface CardViewProps {
  bugs: Bug[];
  onSelectBug: (bugId: number) => void;
}

export const CardView: React.FC<CardViewProps> = ({ bugs, onSelectBug }) => {
  const columns: { status: BugStatus; label: string; headerClass: string }[] = [
    { status: 'Unconfirmed', label: 'UNCONFIRMED', headerClass: 'border-border text-muted-foreground' },
    { status: 'Confirmed', label: 'CONFIRMED', headerClass: 'border-foreground text-foreground' },
    { status: 'In Progress', label: 'IN PROGRESS', headerClass: 'border-[#B497CF] text-[#B497CF]' },
    { status: 'In Review', label: 'IN REVIEW', headerClass: 'border-purple-500 text-purple-400' },
    { status: 'Resolved', label: 'RESOLVED', headerClass: 'border-emerald-500 text-emerald-400' },
    { status: 'Verified', label: 'VERIFIED', headerClass: 'border-teal-500 text-teal-400' }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 pb-6 overflow-x-auto">
      {columns.map((col) => {
        const columnBugs = bugs.filter((b) => b.status === col.status);
        return (
          <div
            key={col.status}
            className="flex flex-col bg-[#0d0d0d] border-2 border-foreground/20 p-3 min-w-[210px] shadow-brutalist"
          >
            {/* Column Header */}
            <div className={`flex items-center justify-between pb-2 mb-2.5 border-b-2 ${col.headerClass}`}>
              <span className="text-xs font-mono font-bold uppercase tracking-wider">{col.label}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 bg-foreground text-background font-bold">
                <AnimatedCounter value={columnBugs.length} />
              </span>
            </div>

            {/* Column Cards */}
            <div className="space-y-2 flex-1 overflow-y-auto max-h-[680px]">
              {columnBugs.map((bug) => {
                const isBug412Stalled = bug.id === 412 && bug.status === 'In Review';
                const isConfidential = Boolean(bug.security_group_id);

                return (
                  <div
                    key={bug.id}
                    onClick={() => onSelectBug(bug.id)}
                    className={`p-2.5 border-2 cursor-pointer transition-all ${isBug412Stalled
                        ? 'border-[#B497CF] bg-[#B497CF]/10'
                        : isConfidential
                          ? 'border-purple-500/60 bg-purple-950/20'
                          : 'border-border hover:border-foreground bg-[#080808]'
                      }`}
                  >
                    <div className="flex items-center justify-between mb-1.5 font-mono text-[10px]">
                      <div className="flex items-center gap-1.5">
                        {isConfidential && <ShieldAlert className="w-3 h-3 text-purple-400 shrink-0" />}
                        <span className="font-bold text-foreground">#{bug.id}</span>
                      </div>
                      <span className="text-muted-foreground bg-[#141414] px-1 py-0.2 border border-border uppercase">
                        {bug.component_id}
                      </span>
                    </div>

                    <p className="text-xs font-bold font-mono text-foreground line-clamp-2 mb-2 leading-snug">
                      {bug.title}
                    </p>

                    {isBug412Stalled && (
                      <div className="flex items-center gap-1 text-[9px] font-mono font-bold bg-[#B497CF] text-background px-1.5 py-0.5 uppercase mb-2 animate-blink">
                        <AlertTriangle className="w-3 h-3" />
                        STALLED // REVIEW?
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground pt-1.5 border-t border-border">
                      <div className="flex items-center gap-1.5 truncate max-w-[110px]">
                        {bug.assignee ? (
                          <span className="text-foreground uppercase truncate">
                            @{bug.assignee.username || bug.assignee.name}
                          </span>
                        ) : (
                          <span className="italic">// UNASSIGNED</span>
                        )}
                      </div>

                      {bug.comments_count ? (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <MessageSquare className="w-3 h-3" />
                          {bug.comments_count}
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })}

              {columnBugs.length === 0 && (
                <div className="p-6 text-center text-muted-foreground text-xs font-mono uppercase">
                  // NO INCIDENTS
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

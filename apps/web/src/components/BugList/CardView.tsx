import React from 'react';
import { Bug, BugStatus } from '@triarc/shared-types';
import { AlertTriangle, MessageSquare, ShieldAlert } from 'lucide-react';

interface CardViewProps {
  bugs: Bug[];
  onSelectBug: (bugId: number) => void;
}

export const CardView: React.FC<CardViewProps> = ({ bugs, onSelectBug }) => {
  const columns: { status: BugStatus; label: string; color: string }[] = [
    { status: 'Unconfirmed', label: 'Unconfirmed', color: 'border-slate-600' },
    { status: 'Confirmed', label: 'Confirmed', color: 'border-sky-500' },
    { status: 'In Progress', label: 'In Progress', color: 'border-amber-500' },
    { status: 'In Review', label: 'In Review', color: 'border-purple-500' },
    { status: 'Resolved', label: 'Resolved', color: 'border-emerald-500' },
    { status: 'Verified', label: 'Verified', color: 'border-teal-500' }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5 pb-6 overflow-x-auto">
      {columns.map((col) => {
        const columnBugs = bugs.filter((b) => b.status === col.status);
        return (
          <div
            key={col.status}
            className="flex flex-col bg-surface-50/60 rounded-xl border border-slate-800/80 p-2.5 min-w-[200px]"
          >
            {/* Column Header */}
            <div className={`flex items-center justify-between pb-2 mb-2 border-b-2 ${col.color}`}>
              <span className="text-xs font-bold text-slate-200">{col.label}</span>
              <span className="text-[11px] font-mono px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-400">
                {columnBugs.length}
              </span>
            </div>

            {/* Column Cards */}
            <div className="space-y-2 flex-1 overflow-y-auto max-h-[680px]">
              {columnBugs.map((bug) => {
                const isBug412Stalled = bug.id === 412 && bug.status === 'In Review';
                return (
                  <div
                    key={bug.id}
                    onClick={() => onSelectBug(bug.id)}
                    className={`p-2.5 rounded-lg bg-surface-100/90 hover:bg-surface-200/90 border border-slate-800/90 hover:border-slate-700 cursor-pointer shadow-sm transition-all transform hover:-translate-y-0.5 ${
                      isBug412Stalled ? 'border-stalled-border bg-stalled-bg/40 shadow-glow-stalled' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono font-bold text-xs text-primary-400">#{bug.id}</span>
                      <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1 py-0.2 rounded">
                        {bug.component_id}
                      </span>
                    </div>

                    <p className="text-xs font-medium text-slate-200 line-clamp-2 mb-2 leading-snug">
                      {bug.title}
                    </p>

                    {isBug412Stalled && (
                      <div className="flex items-center gap-1 text-[10px] font-bold text-stalled-text bg-stalled-bg px-1.5 py-0.5 rounded border border-stalled-border/60 mb-2 animate-pulse-subtle">
                        <AlertTriangle className="w-2.5 h-2.5" />
                        Stalled 4d (Waiting on review)
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                      <div className="flex items-center gap-1.5">
                        {bug.assignee ? (
                          <span className="text-[10px] text-slate-300 font-medium truncate max-w-[80px]">
                            {bug.assignee.name}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500 italic">Unassigned</span>
                        )}
                      </div>

                      {bug.comments_count ? (
                        <span className="flex items-center gap-0.5 text-[10px]">
                          <MessageSquare className="w-2.5 h-2.5 text-slate-500" />
                          {bug.comments_count}
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })}

              {columnBugs.length === 0 && (
                <div className="p-4 text-center text-slate-600 text-xs italic">
                  Empty
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

import React from 'react';
import { Activity } from '@triarc/shared-types';
import { History, Bot, User, ArrowRight } from 'lucide-react';

interface ActivityLogPanelProps {
  activity: Activity[];
}

export const ActivityLogPanel: React.FC<ActivityLogPanelProps> = ({ activity }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <History className="w-3.5 h-3.5 text-primary-400" />
          Full Audit Trail & History (Every Change Logged)
        </h4>
        <span className="text-[11px] font-mono text-slate-500">{activity.length} entries</span>
      </div>

      <div className="space-y-2">
        {activity.map((act) => {
          const isAutomated = !!act.automated;

          return (
            <div
              key={act.id}
              className="p-3 rounded-xl bg-surface-100/70 border border-slate-800/80 text-xs space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isAutomated ? (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[10px] font-mono font-bold">
                      <Bot className="w-2.5 h-2.5" /> Automated
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-300">
                      <User className="w-3 h-3 text-slate-500" />
                      {act.actor_name || act.actor_id || 'User'}
                    </span>
                  )}

                  <span className="text-[11px] font-mono text-slate-400">
                    changed <strong className="text-primary-300">{act.field}</strong>
                  </span>
                </div>

                <span className="text-[10px] font-mono text-slate-500">
                  {new Date(act.created_at).toLocaleString()}
                </span>
              </div>

              {/* Diffs / Values */}
              <div className="flex items-center gap-2 font-mono text-[11px] bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                {act.old_value ? (
                  <>
                    <span className="text-rose-400 line-through truncate max-w-xs">{act.old_value}</span>
                    <ArrowRight className="w-3 h-3 text-slate-600 shrink-0" />
                    <span className="text-emerald-400 font-semibold truncate max-w-xs">{act.new_value}</span>
                  </>
                ) : (
                  <span className="text-emerald-400 truncate">{act.new_value}</span>
                )}
              </div>
            </div>
          );
        })}

        {activity.length === 0 && (
          <div className="p-6 text-center text-slate-500 text-xs italic bg-surface-50/40 rounded-xl border border-slate-800/40">
            No activity records found.
          </div>
        )}
      </div>
    </div>
  );
};

import React from 'react';
import { Activity } from '@triarc/shared-types';
import { History, Bot, User, ArrowRight } from 'lucide-react';

interface ActivityLogPanelProps {
  activity: Activity[];
}

export const ActivityLogPanel: React.FC<ActivityLogPanelProps> = ({ activity }) => {
  return (
    <div className="space-y-3 font-mono text-xs">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          // AUDIT TRAIL & HISTORY LOG
        </h4>
        <span className="text-[10px] text-muted-foreground uppercase">{activity.length} ENTRIES</span>
      </div>

      <div className="space-y-1.5">
        {activity.map((act) => {
          const isAutomated = !!act.automated;

          return (
            <div
              key={act.id}
              className="p-2.5 bg-[#0d0d0d] border-2 border-border space-y-1"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isAutomated ? (
                    <span className="px-1.5 py-0.2 bg-[#ea580c] text-background text-[9px] font-bold uppercase">
                      AUTOMATED
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-foreground uppercase">
                      @{act.actor_name || act.actor_id || 'USER'}
                    </span>
                  )}

                  <span className="text-[10px] text-muted-foreground uppercase">
                    CHANGED <strong className="text-foreground">{act.field}</strong>
                  </span>
                </div>

                <span className="text-[9px] font-mono text-muted-foreground">
                  {new Date(act.created_at).toLocaleString()}
                </span>
              </div>

              {/* Diffs / Values */}
              <div className="flex items-center gap-2 font-mono text-[10px] bg-black p-1.5 border border-border">
                {act.old_value ? (
                  <>
                    <span className="text-red-400 line-through truncate max-w-xs">{act.old_value}</span>
                    <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
                    <span className="text-emerald-400 font-bold truncate max-w-xs">{act.new_value}</span>
                  </>
                ) : (
                  <span className="text-emerald-400 font-bold truncate">{act.new_value}</span>
                )}
              </div>
            </div>
          );
        })}

        {activity.length === 0 && (
          <div className="p-4 text-center text-muted-foreground text-xs uppercase border border-border bg-[#0d0d0d]">
            // ZERO ACTIVITY LOG ENTRIES
          </div>
        )}
      </div>
    </div>
  );
};

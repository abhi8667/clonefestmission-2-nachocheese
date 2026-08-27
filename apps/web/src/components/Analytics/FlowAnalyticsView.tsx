import React, { useState, useEffect } from 'react';
import {
  Activity,
  TrendingUp,
  Clock,
  AlertTriangle,
  GitBranch,
  RefreshCw,
  ArrowRight,
  Loader2,
  ShieldCheck
} from 'lucide-react';
import { fetchFlowAnalytics } from '../../services/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';

interface FlowAnalyticsViewProps {
  onSelectBug: (bugId: number) => void;
}

export const FlowAnalyticsView: React.FC<FlowAnalyticsViewProps> = ({ onSelectBug }) => {
  const { currentUser } = useAuth();
  const [days, setDays] = useState(30);
  const [data, setData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadAnalytics = () => {
    setIsLoading(true);
    fetchFlowAnalytics(days, currentUser?.id)
      .then((res) => {
        setData(res);
      })
      .catch((err) => {
        console.error('Failed to load flow analytics:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    loadAnalytics();
  }, [days, currentUser?.id]);

  const stateColors: Record<string, string> = {
    'Unconfirmed': '#64748B',
    'Confirmed': '#0EA5E9',
    'In Progress': '#F59E0B',
    'In Review': '#A855F7',
    'Resolved': '#10B981',
    'Verified': '#14B8A6',
    'Closed': '#334155',
    'Duplicate': '#52525B',
    'WontFix': '#E11D48'
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface-50/80 p-5 rounded-2xl border border-slate-800/80 shadow-xl">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary-400" />
            Project Momentum & Flow Analytics
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Derived directly from the activity audit log & git linkages across the entire project history.
          </p>
        </div>

        {/* Days filter */}
        <div className="flex items-center gap-2">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="bg-surface-100 border border-slate-700 text-slate-300 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-primary-500 font-mono"
          >
            <option value={7}>Past 7 Days</option>
            <option value={14}>Past 14 Days</option>
            <option value={30}>Past 30 Days</option>
            <option value={60}>Past 60 Days</option>
          </select>

          <button
            onClick={loadAnalytics}
            className="p-1.5 rounded-lg bg-surface-100 hover:bg-surface-200 border border-slate-700 text-slate-400 hover:text-white transition-all"
            title="Refresh analytics"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="p-16 flex flex-col items-center justify-center gap-3 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
          <p className="text-xs font-mono">Computing cumulative-flow areas & stage latencies...</p>
        </div>
      ) : (
        <>
          {/* Key Metric Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-4 rounded-xl bg-surface-50/90 border border-slate-800 shadow-sm space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 block">Avg Triage Time</span>
              <p className="text-lg font-bold text-white font-mono">{data?.summary?.averages?.triage_hours || 0}h</p>
              <span className="text-[10px] text-slate-500">Unconfirmed → Confirmed</span>
            </div>

            <div className="p-4 rounded-xl bg-surface-50/90 border border-slate-800 shadow-sm space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 block">Avg Dev Time</span>
              <p className="text-lg font-bold text-amber-400 font-mono">{data?.summary?.averages?.dev_hours || 0}h</p>
              <span className="text-[10px] text-slate-500">In Progress duration</span>
            </div>

            <div className="p-4 rounded-xl bg-surface-50/90 border border-slate-800 shadow-sm space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 block">Review Latency</span>
              <p className="text-lg font-bold text-purple-400 font-mono">{data?.summary?.averages?.review_hours || 0}h</p>
              <span className="text-[10px] text-slate-500">review? turnaround</span>
            </div>

            <div className="p-4 rounded-xl bg-surface-50/90 border border-slate-800 shadow-sm space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 block">Verify Latency</span>
              <p className="text-lg font-bold text-teal-400 font-mono">{data?.summary?.averages?.verify_hours || 0}h</p>
              <span className="text-[10px] text-slate-500">Resolved → Verified</span>
            </div>

            <div className="p-4 rounded-xl bg-surface-50/90 border border-slate-800 shadow-sm space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 block">Reopen Rate</span>
              <p className="text-lg font-bold text-rose-400 font-mono">{data?.summary?.reopen_rate_percent || 0}%</p>
              <span className="text-[10px] text-slate-500">Resolved → Reopened</span>
            </div>

            <div className="p-4 rounded-xl bg-surface-50/90 border border-slate-800 shadow-sm space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 block">Stalled Items</span>
              <p className="text-lg font-bold text-rose-400 font-mono">{data?.summary?.stalled_count || 0}</p>
              <span className="text-[10px] text-slate-500">Bottlenecks detected</span>
            </div>
          </div>

          {/* Cumulative Flow Diagram (CFD) Area Visualization */}
          <div className="p-5 rounded-2xl bg-surface-50/90 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary-400" />
                  Project-wide Cumulative-Flow Diagram (CFD)
                </h3>
                <p className="text-[11px] text-slate-400">Reconstructed from historical activity log field transitions</p>
              </div>

              {/* Legends */}
              <div className="flex items-center gap-3 text-xs flex-wrap">
                {['Unconfirmed', 'Confirmed', 'In Progress', 'In Review', 'Resolved', 'Verified'].map((st) => (
                  <div key={st} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stateColors[st] }} />
                    <span className="text-[11px] text-slate-300">{st}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Custom SVG Stacked Area Visualization */}
            <div className="h-64 w-full bg-surface-100/80 rounded-xl p-4 border border-slate-800 relative flex items-end">
              <div className="w-full h-full flex items-end gap-1 sm:gap-2">
                {data?.cfd?.map((point: any, idx: number) => {
                  const states = ['Verified', 'Resolved', 'In Review', 'In Progress', 'Confirmed', 'Unconfirmed'];
                  const total = Object.values(point.counts as Record<string, number>).reduce((a, b) => a + b, 0) || 1;

                  return (
                    <div key={idx} className="flex-1 flex flex-col justify-end h-full group relative cursor-pointer">
                      {/* Tooltip on hover */}
                      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block z-30 p-2.5 rounded-lg bg-slate-900 border border-slate-700 shadow-2xl text-[10px] font-mono text-slate-200 whitespace-nowrap">
                        <p className="font-bold text-white mb-1">{point.timestamp}</p>
                        {states.map((s) => (
                          <div key={s} className="flex justify-between gap-3">
                            <span style={{ color: stateColors[s] }}>{s}:</span>
                            <span className="font-bold">{point.counts[s] || 0}</span>
                          </div>
                        ))}
                      </div>

                      {/* Stacked bar layers */}
                      <div className="w-full rounded-t overflow-hidden flex flex-col justify-end h-full">
                        {states.map((s) => {
                          const count = point.counts[s] || 0;
                          const heightPct = (count / total) * 100;
                          return (
                            <div
                              key={s}
                              style={{
                                height: `${heightPct}%`,
                                backgroundColor: stateColors[s],
                                opacity: 0.85
                              }}
                              className="w-full transition-all group-hover:opacity-100"
                            />
                          );
                        })}
                      </div>

                      {/* Date label on every 5th point */}
                      {idx % 5 === 0 && (
                        <span className="text-[9px] font-mono text-slate-500 mt-1 text-center truncate">
                          {point.timestamp.substring(5)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Sleeper Branches Alert Card & Stalled Bugs Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Sleeper Branches (§6.A Headline) */}
            <div className="p-5 rounded-2xl bg-surface-50/90 border border-slate-800 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-white flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-accent-cyan" />
                  Sleeper Branches Detected ({data?.sleeper_branches?.length || 0})
                </h3>
                <span className="text-[10px] text-slate-400 font-mono">Started in Git, went quiet while In Progress</span>
              </div>

              <div className="space-y-2">
                {data?.sleeper_branches?.map((sl: any) => (
                  <div
                    key={sl.bug_id}
                    onClick={() => onSelectBug(sl.bug_id)}
                    className="p-3 rounded-xl bg-surface-100/90 border border-slate-700/80 hover:border-slate-600 flex items-center justify-between gap-3 text-xs cursor-pointer group transition-all"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-primary-400 font-bold">#{sl.bug_id}</span>
                        <span className="font-semibold text-slate-200 group-hover:text-white truncate">{sl.title}</span>
                      </div>
                      <p className="text-[10px] font-mono text-cyan-300 mt-0.5">
                        Branch: {sl.branch_ref} (quiet since {new Date(sl.quiet_since).toLocaleDateString()})
                      </p>
                    </div>

                    <span className="px-2 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold shrink-0">
                      Quiet &gt; 3d
                    </span>
                  </div>
                ))}

                {(!data?.sleeper_branches || data.sleeper_branches.length === 0) && (
                  <div className="p-6 text-center text-slate-500 text-xs italic bg-surface-100/30 rounded-xl">
                    No sleeper branches detected.
                  </div>
                )}
              </div>
            </div>

            {/* Stalled Segments (§5 Headline) */}
            <div className="p-5 rounded-2xl bg-surface-50/90 border border-slate-800 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-white flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  Stalled Bottlenecks ({data?.stalled_bugs?.length || 0})
                </h3>
                <span className="text-[10px] text-slate-400 font-mono">Delayed in review / triage</span>
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto">
                {data?.stalled_bugs?.map((st: any) => (
                  <div
                    key={st.bug_id}
                    onClick={() => onSelectBug(st.bug_id)}
                    className="p-3 rounded-xl bg-stalled-bg/40 border border-stalled-border/60 hover:border-stalled-border flex items-center justify-between gap-3 text-xs cursor-pointer group transition-all"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-rose-300 font-bold">#{st.bug_id}</span>
                        <span className="font-semibold text-slate-200 group-hover:text-white truncate">{st.title}</span>
                      </div>
                      <p className="text-[10px] text-rose-200 mt-0.5 font-medium">
                        {st.stalled_reason}
                      </p>
                    </div>

                    <span className="px-2 py-0.5 rounded-full bg-stalled-bg text-stalled-text border border-stalled-border text-[10px] font-bold shrink-0">
                      {st.stalled_stage}
                    </span>
                  </div>
                ))}

                {(!data?.stalled_bugs || data.stalled_bugs.length === 0) && (
                  <div className="p-6 text-center text-slate-500 text-xs italic bg-surface-100/30 rounded-xl">
                    No stalled bugs detected.
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

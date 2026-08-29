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
  ShieldCheck,
  ShieldAlert,
  Zap,
  Radio,
  BarChart3,
  Flame
} from 'lucide-react';
import { fetchFlowAnalytics } from '../../services/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { WorkflowGraph } from './WorkflowGraph.tsx';
import { CardSkeleton, ChartSkeleton } from '../Common/LoadingSkeleton.tsx';
import { AnimatedCounter } from '../Cyber/AnimatedCounter.tsx';

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
    'Confirmed': '#00E5FF',
    'In Progress': '#F59E0B',
    'In Review': '#A855F7',
    'Resolved': '#00F59B',
    'Verified': '#14B8A6',
    'Closed': '#334155',
    'Duplicate': '#52525B',
    'WontFix': '#FF2A55'
  };

  return (
    <div className="space-y-6">
      {/* Top Header Command HUD */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-950/90 p-5 rounded-2xl border border-cyan-500/20 shadow-cyber-card backdrop-blur-xl cyber-corners">
        <div className="space-y-1">
          <h2 className="text-xl font-bold font-mono text-white flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Activity className="w-5 h-5" />
            </div>
            <span>THREAT MOMENTUM & FLOW ANALYTICS</span>
          </h2>
          <p className="text-xs font-mono text-slate-400">
            Real-time telemetry derived from activity audit events, branch links, and transition bottlenecks.
          </p>
        </div>

        {/* Days Filter HUD */}
        <div className="flex items-center gap-2">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="bg-slate-900 border border-slate-700/80 text-cyan-300 text-xs rounded-xl px-3.5 py-1.5 focus:outline-none focus:border-cyan-500 font-mono shadow-inner"
          >
            <option value={7}>Telemetry: Past 7 Days</option>
            <option value={14}>Telemetry: Past 14 Days</option>
            <option value={30}>Telemetry: Past 30 Days</option>
            <option value={60}>Telemetry: Past 60 Days</option>
          </select>

          <button
            onClick={loadAnalytics}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-400 hover:text-cyan-300 transition-all shadow-sm"
            title="Refresh analytics telemetry"
            aria-label="Refresh analytics telemetry"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <CardSkeleton count={6} />
          <ChartSkeleton />
        </div>
      ) : (
        <>
          {/* Key Metric Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-cyan-500/15 shadow-cyber-card space-y-1.5 hover:border-cyan-500/40 transition-all">
              <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block tracking-wider">Avg Triage SLA</span>
              <p className="text-xl font-black text-white font-mono">
                <AnimatedCounter value={data?.summary?.averages?.triage_hours || 0} suffix="h" />
              </p>
              <span className="text-[10px] font-mono text-slate-500 block">Unconfirmed → Confirmed</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/80 border border-cyan-500/15 shadow-cyber-card space-y-1.5 hover:border-amber-500/40 transition-all">
              <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block tracking-wider">Avg Dev Velocity</span>
              <p className="text-xl font-black text-amber-400 font-mono shadow-glow-amber">
                <AnimatedCounter value={data?.summary?.averages?.dev_hours || 0} suffix="h" />
              </p>
              <span className="text-[10px] font-mono text-slate-500 block">In Progress resolution</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/80 border border-cyan-500/15 shadow-cyber-card space-y-1.5 hover:border-purple-500/40 transition-all">
              <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block tracking-wider">Review Latency</span>
              <p className="text-xl font-black text-purple-400 font-mono shadow-glow-purple">
                <AnimatedCounter value={data?.summary?.averages?.review_hours || 0} suffix="h" />
              </p>
              <span className="text-[10px] font-mono text-slate-500 block">review? turnaround</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/80 border border-cyan-500/15 shadow-cyber-card space-y-1.5 hover:border-teal-500/40 transition-all">
              <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block tracking-wider">Verify Latency</span>
              <p className="text-xl font-black text-teal-400 font-mono">
                <AnimatedCounter value={data?.summary?.averages?.verify_hours || 0} suffix="h" />
              </p>
              <span className="text-[10px] font-mono text-slate-500 block">Resolved → Verified</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/80 border border-cyan-500/15 shadow-cyber-card space-y-1.5 hover:border-red-500/40 transition-all">
              <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block tracking-wider">Reopen Rate</span>
              <p className="text-xl font-black text-red-400 font-mono">
                <AnimatedCounter value={data?.summary?.reopen_rate_percent || 0} suffix="%" />
              </p>
              <span className="text-[10px] font-mono text-slate-500 block">Defect regression</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/80 border border-red-500/30 shadow-glow-red space-y-1.5 hover:border-red-500/60 transition-all">
              <span className="text-[10px] font-mono uppercase font-bold text-red-300 block tracking-wider">Stalled Items</span>
              <p className="text-xl font-black text-red-400 font-mono animate-pulse">
                <AnimatedCounter value={data?.summary?.stalled_count || 0} />
              </p>
              <span className="text-[10px] font-mono text-slate-500 block">Active bottlenecks</span>
            </div>
          </div>

          {/* Cumulative Flow Diagram (CFD) Area Visualization */}
          <div className="p-5 rounded-2xl bg-slate-950/90 border border-cyan-500/20 shadow-cyber-card space-y-4 cyber-corners">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="text-sm font-bold font-mono text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-cyan-400" />
                  <span>CUMULATIVE FLOW TELEMETRY DIAGRAM (CFD)</span>
                </h3>
                <p className="text-[11px] font-mono text-slate-400">Reconstructed from historical activity audit transitions</p>
              </div>

              {/* Legends */}
              <div className="flex items-center gap-3 text-xs flex-wrap font-mono">
                {['Unconfirmed', 'Confirmed', 'In Progress', 'In Review', 'Resolved', 'Verified'].map((st) => (
                  <div key={st} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stateColors[st] }} />
                    <span className="text-[11px] text-slate-300">{st}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Custom SVG Stacked Area Visualization */}
            <div className="h-64 w-full bg-slate-900/90 rounded-xl p-4 border border-slate-800 relative flex items-end">
              <div className="w-full h-full flex items-end gap-1 sm:gap-2">
                {data?.cfd?.map((point: any, idx: number) => {
                  const states = ['Verified', 'Resolved', 'In Review', 'In Progress', 'Confirmed', 'Unconfirmed'];
                  const total = Object.values(point.counts as Record<string, number>).reduce((a, b) => a + b, 0) || 1;

                  return (
                    <div key={idx} className="flex-1 flex flex-col justify-end h-full group relative cursor-pointer">
                      {/* Tooltip on hover */}
                      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block z-30 p-3 rounded-xl bg-slate-950 border border-cyan-500/40 shadow-2xl text-[10px] font-mono text-slate-200 whitespace-nowrap cyber-corners">
                        <p className="font-bold text-white mb-1.5 border-b border-slate-800 pb-1">{point.timestamp}</p>
                        {states.map((s) => (
                          <div key={s} className="flex justify-between gap-4 py-0.5">
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
                              className="w-full transition-all group-hover:opacity-100 group-hover:brightness-125"
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

          {/* Milestone Predictive Delivery Forecast */}
          {data?.milestone_forecasts && data.milestone_forecasts.length > 0 && (
            <div className="p-5 rounded-2xl bg-slate-950/90 border border-cyan-500/20 shadow-cyber-card space-y-3.5 cyber-corners">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-sm font-bold font-mono text-white flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    <span>PREDICTIVE RELEASE MILESTONE FORECAST</span>
                  </h3>
                  <p className="text-[11px] font-mono text-slate-400">
                    Calculated from active velocity ({data?.summary?.throughput_per_week || 0} resolved incidents/week)
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                {data.milestone_forecasts.map((mf: any) => (
                  <div key={mf.id} className="p-4 rounded-xl bg-slate-900/90 border border-slate-700/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-cyan-300">{mf.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Target Due: {mf.due_date || 'No target date'}
                        </span>
                      </div>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono border ${
                          mf.risk_status === 'AT_RISK'
                            ? 'bg-red-950/80 text-red-300 border-red-500/50 shadow-glow-red animate-pulse'
                            : 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50 shadow-glow-neon'
                        }`}
                      >
                        {mf.risk_status === 'AT_RISK' ? '⚠️ AT RISK OF SLIP' : '✓ ON TRACK'}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[11px] font-mono">
                        <span className="text-slate-400">
                          {mf.closed_bugs} of {mf.total_bugs} incidents resolved
                        </span>
                        <span className="text-slate-200 font-bold">{mf.completion_pct}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full transition-all duration-500 shadow-glow-neon"
                          style={{ width: `${mf.completion_pct}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1.5 border-t border-slate-800">
                      <span>
                        Remaining effort: <strong className="text-slate-200">{mf.remaining_hours}h</strong>
                      </span>
                      <span>
                        Predicted delivery:{' '}
                        <strong className="text-cyan-300 font-mono">{mf.predicted_completion_date}</strong>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sleeper Branches Alert Card & Stalled Bugs Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Sleeper Branches */}
            <div className="p-5 rounded-2xl bg-slate-950/90 border border-cyan-500/20 shadow-cyber-card space-y-3 cyber-corners">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold font-mono text-white flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-cyan-400" />
                  <span>SLEEPER BRANCHES DETECTED ({data?.sleeper_branches?.length || 0})</span>
                </h3>
                <span className="text-[10px] text-slate-400 font-mono">Quiet while in progress &gt; 3d</span>
              </div>

              <div className="space-y-2">
                {data?.sleeper_branches?.map((sl: any) => (
                  <div
                    key={sl.bug_id}
                    onClick={() => onSelectBug(sl.bug_id)}
                    className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-cyan-500/50 flex items-center justify-between gap-3 text-xs cursor-pointer group transition-all"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-cyan-400 font-bold">#{sl.bug_id}</span>
                        <span className="font-semibold text-slate-200 group-hover:text-white truncate">{sl.title}</span>
                      </div>
                      <p className="text-[10px] font-mono text-cyan-300/80 mt-0.5">
                        Branch: {sl.branch_ref} (quiet since {new Date(sl.quiet_since).toLocaleDateString()})
                      </p>
                    </div>

                    <span className="px-2 py-1 rounded-md bg-amber-950/80 text-amber-300 border border-amber-500/40 text-[10px] font-mono font-bold shrink-0">
                      Quiet &gt; 3d
                    </span>
                  </div>
                ))}

                {(!data?.sleeper_branches || data.sleeper_branches.length === 0) && (
                  <div className="p-6 text-center text-slate-500 text-xs font-mono italic bg-slate-900/40 rounded-xl">
                    No sleeper branches detected.
                  </div>
                )}
              </div>
            </div>

            {/* Stalled Segments */}
            <div className="p-5 rounded-2xl bg-slate-950/90 border border-red-500/20 shadow-cyber-card space-y-3 cyber-corners">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold font-mono text-white flex items-center gap-2">
                  <Flame className="w-4 h-4 text-red-400" />
                  <span>STALLED BOTTLENECKS ({data?.stalled_bugs?.length || 0})</span>
                </h3>
                <span className="text-[10px] text-slate-400 font-mono">Delayed in review / triage</span>
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto pr-0.5">
                {data?.stalled_bugs?.map((st: any) => (
                  <div
                    key={st.bug_id}
                    onClick={() => onSelectBug(st.bug_id)}
                    className="p-3 rounded-xl bg-red-950/30 border border-red-500/40 hover:border-red-500/70 flex items-center justify-between gap-3 text-xs cursor-pointer group transition-all shadow-glow-red"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-red-300 font-bold">#{st.bug_id}</span>
                        <span className="font-semibold text-slate-200 group-hover:text-white truncate">{st.title}</span>
                      </div>
                      <p className="text-[10px] text-red-200/90 mt-0.5 font-mono">
                        {st.stalled_reason}
                      </p>
                    </div>

                    <span className="px-2.5 py-0.5 rounded-full bg-red-950 text-red-300 border border-red-500 text-[10px] font-mono font-bold shrink-0">
                      {st.stalled_stage}
                    </span>
                  </div>
                ))}

                {(!data?.stalled_bugs || data.stalled_bugs.length === 0) && (
                  <div className="p-6 text-center text-slate-500 text-xs font-mono italic bg-slate-900/40 rounded-xl">
                    Zero stalled bottlenecks detected.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Interactive Workflow State Machine Graph */}
          {data?.workflow && (
            <WorkflowGraph
              workflow={data.workflow}
            />
          )}
        </>
      )}
    </div>
  );
};

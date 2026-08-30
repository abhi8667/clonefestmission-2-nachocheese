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
    'Unconfirmed': '#525252',
    'Confirmed': '#ea580c',
    'In Progress': '#d97706',
    'In Review': '#7c3aed',
    'Resolved': '#10b981',
    'Verified': '#059669',
    'Closed': '#262626',
    'Duplicate': '#404040',
    'WontFix': '#dc2626'
  };

  return (
    <div className="space-y-6">
      {/* Top Header Command HUD */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0d0d0d] p-5 border border-border shadow-sm rounded-sm">
        <div className="space-y-1">
          <h2 className="text-base font-bold font-mono text-foreground uppercase tracking-wider flex items-center gap-2.5">
            <div className="w-7 h-7 bg-foreground text-background flex items-center justify-center font-bold rounded-sm">
              <Activity className="w-4 h-4 text-background" />
            </div>
            <span>LIFECYCLE FLOW ANALYTICS & CFD TELEMETRY</span>
          </h2>
          <p className="text-xs font-mono text-muted-foreground uppercase">
            Real-time telemetry derived from activity audit logs, git events, and lifecycle bottlenecks.
          </p>
        </div>

        {/* Days Filter HUD */}
        <div className="flex items-center gap-2">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="bg-[#080808] border border-border text-foreground text-xs px-3 py-1.5 focus:outline-none focus:border-foreground font-mono uppercase rounded-sm"
          >
            <option value={7}>WINDOW: PAST 7 DAYS</option>
            <option value={14}>WINDOW: PAST 14 DAYS</option>
            <option value={30}>WINDOW: PAST 30 DAYS</option>
            <option value={60}>WINDOW: PAST 60 DAYS</option>
          </select>

          <button
            onClick={loadAnalytics}
            className="p-2 border border-border hover:border-foreground text-muted-foreground hover:text-foreground bg-[#080808] transition-all rounded-sm"
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
            <div className="p-4 bg-[#0d0d0d] border border-border hover:border-foreground shadow-sm space-y-1 transition-all rounded-sm">
              <span className="text-[10px] font-mono uppercase font-bold text-muted-foreground block tracking-wider">AVG TRIAGE SLA</span>
              <p className="text-xl font-black text-foreground font-mono">
                <AnimatedCounter value={data?.summary?.averages?.triage_hours || 0} suffix="H" />
              </p>
              <span className="text-[9px] font-mono text-muted-foreground uppercase block">UNCONF → CONF</span>
            </div>

            <div className="p-4 bg-[#0d0d0d] border border-border hover:border-[#ea580c] shadow-sm space-y-1 transition-all rounded-sm">
              <span className="text-[10px] font-mono uppercase font-bold text-muted-foreground block tracking-wider">DEV VELOCITY</span>
              <p className="text-xl font-black text-[#ea580c] font-mono">
                <AnimatedCounter value={data?.summary?.averages?.dev_hours || 0} suffix="H" />
              </p>
              <span className="text-[9px] font-mono text-muted-foreground uppercase block">IN PROGRESS RES</span>
            </div>

            <div className="p-4 bg-[#0d0d0d] border border-border hover:border-foreground shadow-sm space-y-1 transition-all rounded-sm">
              <span className="text-[10px] font-mono uppercase font-bold text-muted-foreground block tracking-wider">REVIEW LATENCY</span>
              <p className="text-xl font-black text-foreground font-mono">
                <AnimatedCounter value={data?.summary?.averages?.review_hours || 0} suffix="H" />
              </p>
              <span className="text-[9px] font-mono text-muted-foreground uppercase block">FLAG REVIEW TURNAROUND</span>
            </div>

            <div className="p-4 bg-[#0d0d0d] border border-border hover:border-foreground shadow-sm space-y-1 transition-all rounded-sm">
              <span className="text-[10px] font-mono uppercase font-bold text-muted-foreground block tracking-wider">VERIFY LATENCY</span>
              <p className="text-xl font-black text-foreground font-mono">
                <AnimatedCounter value={data?.summary?.averages?.verify_hours || 0} suffix="H" />
              </p>
              <span className="text-[9px] font-mono text-muted-foreground uppercase block">RESOLVED → VERIFIED</span>
            </div>

            <div className="p-4 bg-[#0d0d0d] border border-border hover:border-red-500 shadow-sm space-y-1 transition-all rounded-sm">
              <span className="text-[10px] font-mono uppercase font-bold text-muted-foreground block tracking-wider">REOPEN RATE</span>
              <p className="text-xl font-black text-red-500 font-mono">
                <AnimatedCounter value={data?.summary?.reopen_rate_percent || 0} suffix="%" />
              </p>
              <span className="text-[9px] font-mono text-muted-foreground uppercase block">DEFECT REGRESSION</span>
            </div>

            <div className="p-4 bg-[#0d0d0d] border border-[#ea580c] shadow-sm space-y-1 transition-all rounded-sm">
              <span className="text-[10px] font-mono uppercase font-bold text-[#ea580c] block tracking-wider">STALLED BUGS</span>
              <p className="text-xl font-black text-foreground font-mono">
                <AnimatedCounter value={data?.summary?.stalled_count || 0} />
              </p>
              <span className="text-[9px] font-mono text-muted-foreground uppercase block">ACTIVE BOTTLENECKS</span>
            </div>
          </div>

          {/* Cumulative Flow Diagram (CFD) Area Visualization */}
          <div className="p-5 bg-[#0d0d0d] border border-border shadow-sm space-y-3.5 rounded-sm">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="text-xs font-bold font-mono text-foreground uppercase tracking-wider flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#ea580c]" />
                  <span>CUMULATIVE FLOW DIAGRAM (CFD)</span>
                </h3>
                <p className="text-[10px] font-mono text-muted-foreground uppercase">Reconstructed from historical activity audit trail</p>
              </div>

              {/* Legends */}
              <div className="flex items-center gap-3 text-xs flex-wrap font-mono">
                {['Unconfirmed', 'Confirmed', 'In Progress', 'In Review', 'Resolved', 'Verified'].map((st) => (
                  <div key={st} className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-xs" style={{ backgroundColor: stateColors[st] }} />
                    <span className="text-[10px] text-muted-foreground uppercase">{st}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Custom SVG Stacked Area Visualization */}
            <div className="h-64 w-full bg-black p-3.5 border border-border relative flex items-end rounded-sm">
              <div className="w-full h-full flex items-end gap-1 sm:gap-2">
                {data?.cfd?.map((point: any, idx: number) => {
                  const states = ['Verified', 'Resolved', 'In Review', 'In Progress', 'Confirmed', 'Unconfirmed'];
                  const total = Object.values(point.counts as Record<string, number>).reduce((a, b) => a + b, 0) || 1;

                  return (
                    <div key={idx} className="flex-1 flex flex-col justify-end h-full group relative cursor-pointer">
                      {/* Tooltip on hover */}
                      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block z-30 p-2.5 bg-[#080808] border border-border shadow-lg text-[10px] font-mono text-foreground whitespace-nowrap rounded-sm">
                        <p className="font-bold text-foreground mb-1 border-b border-border pb-1 uppercase">{point.timestamp}</p>
                        {states.map((s) => (
                          <div key={s} className="flex justify-between gap-4 py-0.2 uppercase">
                            <span style={{ color: stateColors[s] }}>{s}:</span>
                            <span className="font-bold">{point.counts[s] || 0}</span>
                          </div>
                        ))}
                      </div>

                      {/* Stacked bar layers */}
                      <div className="w-full overflow-hidden flex flex-col justify-end h-full">
                        {states.map((s) => {
                          const count = point.counts[s] || 0;
                          const heightPct = (count / total) * 100;
                          return (
                            <div
                              key={s}
                              style={{
                                height: `${heightPct}%`,
                                backgroundColor: stateColors[s],
                                opacity: 0.9
                              }}
                              className="w-full transition-all group-hover:opacity-100"
                            />
                          );
                        })}
                      </div>

                      {/* Date label on every 5th point */}
                      {idx % 5 === 0 && (
                        <span className="text-[9px] font-mono text-muted-foreground mt-1 text-center truncate uppercase">
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
            <div className="p-5 bg-[#0d0d0d] border border-border shadow-sm space-y-3.5 rounded-sm">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-xs font-bold font-mono text-foreground uppercase tracking-wider flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    <span>PREDICTIVE RELEASE MILESTONE FORECAST</span>
                  </h3>
                  <p className="text-[10px] font-mono text-muted-foreground uppercase">
                    ACTIVE THROUGHPUT: {data?.summary?.throughput_per_week || 0} INCIDENTS/WEEK
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                {data.milestone_forecasts.map((mf: any) => (
                  <div key={mf.id} className="p-3.5 bg-black border border-border space-y-2.5 rounded-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-foreground uppercase">{mf.name}</span>
                        <span className="text-[10px] text-muted-foreground font-mono uppercase">
                          DUE: {mf.due_date || 'NONE'}
                        </span>
                      </div>
                      <span
                        className={`px-1.5 py-0.2 text-[9px] font-bold font-mono uppercase rounded-sm ${mf.risk_status === 'AT_RISK'
                            ? 'bg-red-950 text-red-300 border border-red-500'
                            : 'bg-emerald-950 text-emerald-300 border border-emerald-500'
                          }`}
                      >
                        {mf.risk_status === 'AT_RISK' ? '⚠️ AT RISK' : '✓ ON TRACK'}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-mono uppercase">
                        <span className="text-muted-foreground">
                          {mf.closed_bugs}/{mf.total_bugs} RESOLVED
                        </span>
                        <span className="text-foreground font-bold">{mf.completion_pct}%</span>
                      </div>
                      <div className="w-full h-2 bg-[#1a1a1a] overflow-hidden border border-border rounded-xs">
                        <div
                          className="h-full bg-[#ea580c] transition-all duration-500"
                          style={{ width: `${mf.completion_pct}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground pt-1.5 border-t border-border uppercase">
                      <span>
                        EFFORT: <strong className="text-foreground">{mf.remaining_hours}H</strong>
                      </span>
                      <span>
                        ETA: <strong className="text-[#ea580c]">{mf.predicted_completion_date}</strong>
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
            <div className="p-5 bg-[#0d0d0d] border border-border shadow-sm space-y-3 rounded-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold font-mono text-foreground uppercase tracking-wider flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-[#ea580c]" />
                  <span>SLEEPER BRANCHES ({data?.sleeper_branches?.length || 0})</span>
                </h3>
                <span className="text-[9px] text-muted-foreground uppercase font-mono">QUIET &gt; 3D</span>
              </div>

              <div className="space-y-1.5">
                {data?.sleeper_branches?.map((sl: any) => (
                  <div
                    key={sl.bug_id}
                    onClick={() => onSelectBug(sl.bug_id)}
                    className="p-2.5 bg-black border border-border hover:border-foreground flex items-center justify-between gap-3 text-xs cursor-pointer group transition-all"
                  >
                    <div className="min-w-0 font-mono">
                      <div className="flex items-center gap-2">
                        <span className="text-[#ea580c] font-bold">#{sl.bug_id}</span>
                        <span className="font-bold text-foreground group-hover:underline truncate uppercase">{sl.title}</span>
                      </div>
                      <p className="text-[9px] text-muted-foreground mt-0.5 uppercase">
                        REF: {sl.branch_ref} (QUIET SINCE {new Date(sl.quiet_since).toLocaleDateString()})
                      </p>
                    </div>

                    <span className="px-1.5 py-0.2 bg-amber-950 text-amber-300 border border-amber-500 text-[9px] font-mono font-bold uppercase shrink-0">
                      QUIET &gt; 3D
                    </span>
                  </div>
                ))}

                {(!data?.sleeper_branches || data.sleeper_branches.length === 0) && (
                  <div className="p-4 text-center text-muted-foreground text-xs font-mono uppercase border border-border bg-black">
                    // ZERO SLEEPER BRANCHES DETECTED
                  </div>
                )}
              </div>
            </div>

            {/* Stalled Segments */}
            <div className="p-4 bg-[#0d0d0d] border-2 border-border shadow-brutalist space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold font-mono text-foreground uppercase tracking-wider flex items-center gap-2">
                  <Flame className="w-4 h-4 text-[#ea580c]" />
                  <span>// STALLED BOTTLENECKS ({data?.stalled_bugs?.length || 0})</span>
                </h3>
                <span className="text-[9px] text-muted-foreground uppercase font-mono">DELAYS IN TRIAGE / REVIEW</span>
              </div>

              <div className="space-y-1.5 max-h-72 overflow-y-auto pr-0.5">
                {data?.stalled_bugs?.map((st: any) => (
                  <div
                    key={st.bug_id}
                    onClick={() => onSelectBug(st.bug_id)}
                    className="p-2.5 bg-black border border-red-500 hover:border-red-400 flex items-center justify-between gap-3 text-xs cursor-pointer group transition-all"
                  >
                    <div className="min-w-0 font-mono">
                      <div className="flex items-center gap-2">
                        <span className="text-red-400 font-bold">#{st.bug_id}</span>
                        <span className="font-bold text-foreground group-hover:underline truncate uppercase">{st.title}</span>
                      </div>
                      <p className="text-[9px] text-muted-foreground mt-0.5 uppercase">
                        {st.stalled_reason}
                      </p>
                    </div>

                    <span className="px-1.5 py-0.2 bg-red-950 text-red-300 border border-red-500 text-[9px] font-mono font-bold uppercase shrink-0">
                      {st.stalled_stage}
                    </span>
                  </div>
                ))}

                {(!data?.stalled_bugs || data.stalled_bugs.length === 0) && (
                  <div className="p-4 text-center text-muted-foreground text-xs font-mono uppercase border border-border bg-black">
                    // ZERO STALLED BOTTLENECKS DETECTED
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

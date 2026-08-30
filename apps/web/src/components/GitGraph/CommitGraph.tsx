import React, { useMemo, useRef, useState } from 'react';
import { GitGraph, GitGraphNode } from '@triarc/shared-types';
import { GitBranch, GitMerge, Moon, Bug } from 'lucide-react';

const COL_W = 52;      // horizontal distance between commits
const LANE_H = 58;     // vertical distance between branch lanes
const PAD_X = 36;
const PAD_Y = 34;
const DOT_R = 6;

/** Lane colours. Lane 0 (the trunk) is always the app accent. */
const LANE_COLORS = [
  '#ea580c', // trunk — accent orange
  '#10b981',
  '#00e5ff',
  '#a855f7',
  '#f59e0b',
  '#ef4444',
  '#38bdf8',
  '#84cc16'
];

const colorFor = (lane: number) => LANE_COLORS[lane % LANE_COLORS.length];

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

interface Props {
  graph: GitGraph;
  onSelectCommit?: (node: GitGraphNode) => void;
}

export const CommitGraph: React.FC<Props> = ({ graph, onSelectCommit }) => {
  const [hovered, setHovered] = useState<GitGraphNode | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { nodes, lanes } = graph;

  const width = PAD_X * 2 + Math.max(1, nodes.length) * COL_W;
  const height = PAD_Y * 2 + Math.max(1, lanes.length) * LANE_H;

  const x = (index: number) => PAD_X + index * COL_W + COL_W / 2;
  const y = (lane: number) => PAD_Y + lane * LANE_H + LANE_H / 2;

  // One path per lane: the divergence curve, the run along the lane, and the
  // merge curve back into the trunk when the branch was merged.
  const lanePaths = useMemo(() => {
    return lanes.map((lane) => {
      const own = nodes.filter((n) => n.lane === lane.lane);
      if (own.length === 0) return { lane, d: '', tail: null as null | { x: number; y: number } };

      const firstX = x(own[0].index);
      const lastX = x(own[own.length - 1].index);
      const laneY = y(lane.lane);

      let d = '';

      const trunkY = y(0);

      if (lane.is_default) {
        // The trunk is one continuous spine.
        d = `M ${x(0)} ${laneY} L ${lastX} ${laneY}`;
      } else if (lane.branched_from_index === null) {
        // No trunk ancestor in range (a long-lived release branch): run the lane
        // on its own rather than sweeping a fake fork across the whole chart.
        d = `M ${firstX} ${laneY} L ${lastX} ${laneY}`;
      } else {
        const originX = x(lane.branched_from_index);
        const c = Math.max(12, (firstX - originX) / 2);
        // Diverge from the trunk, then run flat along this lane.
        d = `M ${originX} ${trunkY} C ${originX + c} ${trunkY}, ${firstX - c} ${laneY}, ${firstX} ${laneY}`;
        if (lastX > firstX) d += ` L ${lastX} ${laneY}`;
      }

      if (!lane.is_default && lane.merged_at_index !== null) {
        const mergeX = x(lane.merged_at_index);
        const mc = Math.max(12, (mergeX - lastX) / 2);
        d += ` M ${lastX} ${laneY} C ${lastX + mc} ${laneY}, ${mergeX - mc} ${trunkY}, ${mergeX} ${trunkY}`;
      }

      return {
        lane,
        d,
        // Unmerged branches get an open cap so you can see they never landed.
        tail: !lane.is_default && lane.merged_at_index === null
          ? { x: lastX, y: laneY }
          : null
      };
    });
  }, [nodes, lanes]);

  if (nodes.length === 0) {
    return (
      <div className="border border-border bg-[#0e0e0e] p-10 text-center">
        <GitBranch className="w-7 h-7 text-muted-foreground mx-auto mb-3" />
        <p className="text-xs uppercase font-bold text-foreground mb-1">No commit history</p>
        <p className="text-xs text-muted-foreground">
          Connect a repository to plot its branches over time.
        </p>
      </div>
    );
  }

  return (
    <div className="border border-border bg-[#0e0e0e]">
      {/* Legend */}
      <div className="flex items-center gap-4 flex-wrap px-4 py-2.5 border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-0.5" style={{ background: colorFor(0) }} />
          {graph.default_branch} <span className="opacity-60">(trunk)</span>
        </span>
        <span className="flex items-center gap-1.5">
          <GitMerge className="w-3 h-3 text-emerald-400" /> merged
        </span>
        <span className="flex items-center gap-1.5">
          <Moon className="w-3 h-3 text-amber-400" /> sleeper &gt;3d
        </span>
        <span className="flex items-center gap-1.5">
          <Bug className="w-3 h-3 text-[#ea580c]" /> linked issue
        </span>
        <span className="ml-auto tabular-nums">
          {graph.stats.total_commits} commits · {graph.stats.total_branches} branches · {graph.stats.spans_days}d
        </span>
      </div>

      <div className="flex">
        {/* Sticky lane labels */}
        <div className="shrink-0 w-44 border-r border-border bg-[#0a0a0a]" style={{ paddingTop: PAD_Y }}>
          {lanes.map((lane) => (
            <div
              key={lane.branch}
              className="flex items-center gap-2 px-3"
              style={{ height: LANE_H }}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: colorFor(lane.lane) }}
              />
              <div className="min-w-0 flex-1">
                <div
                  className="text-[11px] font-bold truncate"
                  style={{ color: lane.is_default ? '#F2F1EA' : colorFor(lane.lane) }}
                  title={lane.branch}
                >
                  {lane.branch}
                </div>
                <div className="text-[9px] uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                  {lane.is_default
                    ? 'trunk'
                    : lane.is_merged
                      ? <><GitMerge className="w-2.5 h-2.5 text-emerald-400" />merged</>
                      : lane.is_sleeper
                        ? <><Moon className="w-2.5 h-2.5 text-amber-400" />sleeper</>
                        : 'open'}
                  <span className="tabular-nums opacity-70">· {lane.commit_count}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Scrollable graph. min-w-0 is required: a flex child defaults to
            min-width:auto and would otherwise push the page body sideways
            instead of scrolling inside this container. */}
        <div ref={scrollRef} className="overflow-x-auto flex-1 min-w-0 relative">
          <svg
            width={width}
            height={height}
            role="img"
            aria-label={`Commit graph: ${graph.stats.total_commits} commits across ${graph.stats.total_branches} branches`}
          >
            {/* Lane guide rules */}
            {lanes.map((lane) => (
              <line
                key={`g-${lane.branch}`}
                x1={0}
                x2={width}
                y1={y(lane.lane)}
                y2={y(lane.lane)}
                stroke="rgba(242,241,234,0.06)"
                strokeWidth={1}
              />
            ))}

            {/* Branch paths */}
            {lanePaths.map(({ lane, d, tail }) => (
              <g key={`p-${lane.branch}`}>
                <path
                  d={d}
                  fill="none"
                  stroke={colorFor(lane.lane)}
                  strokeWidth={lane.is_default ? 2.5 : 1.75}
                  strokeLinecap="round"
                  opacity={lane.is_sleeper ? 0.5 : 1}
                  strokeDasharray={lane.is_sleeper ? '5 4' : undefined}
                />
                {tail && (
                  <circle
                    cx={tail.x + 14}
                    cy={tail.y}
                    r={2.5}
                    fill={colorFor(lane.lane)}
                    opacity={0.5}
                  />
                )}
              </g>
            ))}

            {/* Commit dots */}
            {nodes.map((n) => {
              const isHot = hovered?.sha === n.sha;
              const c = colorFor(n.lane);
              return (
                <g
                  key={n.sha}
                  transform={`translate(${x(n.index)}, ${y(n.lane)})`}
                  onMouseEnter={() => setHovered(n)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => onSelectCommit?.(n)}
                  style={{ cursor: onSelectCommit ? 'pointer' : 'default' }}
                >
                  <circle r={DOT_R + 7} fill="transparent" />
                  {n.is_merge ? (
                    <rect
                      x={-DOT_R} y={-DOT_R} width={DOT_R * 2} height={DOT_R * 2}
                      transform="rotate(45)"
                      fill="#0e0e0e" stroke={c} strokeWidth={2}
                    />
                  ) : (
                    <circle
                      r={isHot ? DOT_R + 2 : DOT_R}
                      fill={n.bug_id ? c : '#0e0e0e'}
                      stroke={c}
                      strokeWidth={2}
                    />
                  )}
                  {isHot && (
                    <circle r={DOT_R + 6} fill="none" stroke={c} strokeWidth={1} opacity={0.5} />
                  )}
                </g>
              );
            })}
          </svg>

          {/* Hover detail */}
          {hovered && (
            <div
              className="absolute z-20 pointer-events-none bg-[#121212] border border-border shadow-lg px-3 py-2 max-w-xs"
              style={{
                left: Math.min(x(hovered.index) + 14, width - 260),
                top: y(hovered.lane) + 16
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-[10px] font-bold" style={{ color: colorFor(hovered.lane) }}>
                  {hovered.short_sha}
                </span>
                <span className="text-[9px] uppercase text-muted-foreground truncate">
                  {hovered.branch}
                </span>
              </div>
              <p className="text-[11px] text-foreground leading-snug mb-1.5 line-clamp-3">
                {hovered.message}
              </p>
              <div className="text-[9px] uppercase tracking-wide text-muted-foreground flex items-center gap-1.5 flex-wrap">
                <span>@{hovered.author_username}</span>
                <span>·</span>
                <span>{relativeTime(hovered.created_at)}</span>
                {hovered.bug_id && (
                  <>
                    <span>·</span>
                    <span className="text-[#ea580c] font-bold">#{hovered.bug_id}</span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { WorkflowConfig, WorkflowTransition } from '@triarc/shared-types';
import { GitBranch, ShieldCheck, Lock, CheckCircle2, AlertCircle, Info, Radio, Sparkles } from 'lucide-react';

interface WorkflowGraphProps {
  workflow: WorkflowConfig;
  activeState?: string;
  onSelectState?: (state: string) => void;
}

interface NodeLayout {
  id: string;
  x: number;
  y: number;
  label: string;
  color: string;
}

export const WorkflowGraph: React.FC<WorkflowGraphProps> = ({
  workflow,
  activeState,
  onSelectState
}) => {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedTransition, setSelectedTransition] = useState<WorkflowTransition | null>(null);

  // Position nodes in a 2-tier layout
  const nodes: NodeLayout[] = [
    { id: 'Unconfirmed', x: 70, y: 70, label: 'Unconfirmed', color: '#64748B' },
    { id: 'Confirmed', x: 230, y: 70, label: 'Confirmed', color: '#00E5FF' },
    { id: 'In Progress', x: 390, y: 70, label: 'In Progress', color: '#F59E0B' },
    { id: 'In Review', x: 550, y: 70, label: 'In Review', color: '#A855F7' },
    { id: 'Resolved', x: 710, y: 70, label: 'Resolved', color: '#00F59B' },
    { id: 'Verified', x: 870, y: 70, label: 'Verified', color: '#14B8A6' },
    { id: 'Closed', x: 990, y: 70, label: 'Closed', color: '#475569' },
    { id: 'Duplicate', x: 450, y: 200, label: 'Duplicate', color: '#71717A' },
    { id: 'WontFix', x: 650, y: 200, label: 'WontFix', color: '#FF2A55' }
  ];

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  // Get outgoing transitions for hovered state
  const outgoingTransitions = workflow.transitions.filter((t) => {
    if (!hoveredNode) return false;
    return t.from === hoveredNode || t.from === '*';
  });

  const getPath = (fromId: string, toId: string) => {
    const from = nodeMap.get(fromId);
    const to = nodeMap.get(toId);
    if (!from || !to) return '';

    if (from.y === to.y) {
      if (from.x < to.x) {
        // Forward horizontal
        return `M ${from.x + 55} ${from.y} L ${to.x - 55} ${to.y}`;
      } else {
        // Backward loop curve
        return `M ${from.x} ${from.y - 25} C ${from.x} ${from.y - 65}, ${to.x} ${to.y - 65}, ${to.x} ${to.y - 25}`;
      }
    } else {
      // Cross tier (downward curve)
      return `M ${from.x} ${from.y + 25} C ${from.x} ${from.y + 80}, ${to.x} ${to.y - 80}, ${to.x} ${to.y - 25}`;
    }
  };

  return (
    <div className="rounded-2xl bg-slate-950/90 border border-cyan-500/20 p-5 shadow-cyber-card space-y-4 cyber-corners">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-bold font-mono text-white flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-cyan-400" />
            <span>INTERACTIVE WORKFLOW STATE MACHINE ENGINE</span>
          </h3>
          <p className="text-[11px] font-mono text-slate-400">
            Declarative state machine schema rendered dynamically with cryptographic guard verification
          </p>
        </div>

        <div className="flex items-center gap-4 text-[11px] font-mono text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-glow-neon" /> Active Channel
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-purple-400 shadow-glow-purple" /> Cryptographic Guard
          </span>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="w-full overflow-x-auto bg-slate-900/90 rounded-xl p-4 border border-slate-800/80">
        <svg viewBox="0 0 1080 270" className="w-full min-w-[900px] h-64 select-none">
          <defs>
            <marker
              id="arrow"
              viewBox="0 0 10 10"
              refX="6"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#475569" />
            </marker>
            <marker
              id="arrow-active"
              viewBox="0 0 10 10"
              refX="6"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#00E5FF" />
            </marker>
            <marker
              id="arrow-guard"
              viewBox="0 0 10 10"
              refX="6"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#A855F7" />
            </marker>
          </defs>

          {/* Transitions (Edges) */}
          {workflow.transitions.map((t, idx) => {
            const isWildcard = t.from === '*';
            const sources = isWildcard
              ? ['In Progress', 'In Review', 'Confirmed', 'Resolved']
              : [t.from];

            return sources.map((src, sIdx) => {
              const d = getPath(src, t.to);
              if (!d) return null;

              const isHighlighted =
                hoveredNode === src || hoveredNode === t.to || (hoveredNode && isWildcard);
              const hasGuard = !!t.guards;

              return (
                <g
                  key={`${idx}-${sIdx}`}
                  onClick={() => setSelectedTransition(t)}
                  className="cursor-pointer"
                >
                  <path
                    d={d}
                    fill="none"
                    stroke={
                      isHighlighted
                        ? hasGuard
                          ? '#A855F7'
                          : '#00E5FF'
                        : '#334155'
                    }
                    strokeWidth={isHighlighted ? 2.5 : 1.5}
                    strokeDasharray={isWildcard ? '4 3' : undefined}
                    markerEnd={
                      isHighlighted
                        ? hasGuard
                          ? 'url(#arrow-guard)'
                          : 'url(#arrow-active)'
                        : 'url(#arrow)'
                    }
                    className="transition-all duration-200 hover:stroke-cyan-400 hover:stroke-[3]"
                  />
                </g>
              );
            });
          })}

          {/* States (Nodes) */}
          {nodes.map((node) => {
            const isHovered = hoveredNode === node.id;
            const isActive = activeState === node.id;

            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
                onClick={() => onSelectState && onSelectState(node.id)}
                className="cursor-pointer group"
              >
                {/* Node Box */}
                <rect
                  x="-55"
                  y="-22"
                  width="110"
                  height="44"
                  rx="10"
                  fill={isHovered ? '#0B132B' : '#040711'}
                  stroke={isActive ? '#00E5FF' : isHovered ? node.color : '#334155'}
                  strokeWidth={isActive || isHovered ? 2.5 : 1.5}
                  className="transition-all duration-200"
                  style={{
                    filter:
                      isHovered || isActive
                        ? `drop-shadow(0 0 12px ${node.color}80)`
                        : undefined
                  }}
                />

                {/* Status Beacon Dot */}
                <circle cx="-40" cy="0" r="4.5" fill={node.color} />

                {/* State Label */}
                <text
                  x="-30"
                  y="4"
                  fill="#F8FAFC"
                  fontSize="11"
                  fontWeight="bold"
                  fontFamily="JetBrains Mono, monospace"
                >
                  {node.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Selected / Hovered State Inspector */}
      {hoveredNode && (
        <div className="p-3.5 bg-slate-900/90 rounded-xl border border-cyan-500/30 text-xs font-mono flex items-center justify-between gap-4 animate-fade-in cyber-corners">
          <div>
            <span className="text-slate-400">STATE INSPECTION: </span>
            <strong className="text-white">{hoveredNode}</strong>
            <span className="text-slate-400 ml-4">VALID DESTINATIONS: </span>
            <span className="text-cyan-300 font-bold">
              {outgoingTransitions.map((t) => t.to).join(', ') || 'Terminal State'}
            </span>
          </div>
          <div className="text-[11px]">
            {outgoingTransitions.some((t) => t.guards) && (
              <span className="text-purple-300 font-semibold flex items-center gap-1.5 shadow-glow-purple">
                <Lock className="w-3.5 h-3.5 text-purple-400" />
                <span>Cryptographic clearance guard enforced on transition</span>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

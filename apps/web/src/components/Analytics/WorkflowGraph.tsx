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

  // Position nodes in a 2-tier layout
  const nodes: NodeLayout[] = [
    { id: 'Unconfirmed', x: 70, y: 70, label: 'UNCONFIRMED', color: '#737373' },
    { id: 'Confirmed', x: 230, y: 70, label: 'CONFIRMED', color: '#B497CF' },
    { id: 'In Progress', x: 390, y: 70, label: 'IN PROGRESS', color: '#f59e0b' },
    { id: 'In Review', x: 550, y: 70, label: 'IN REVIEW', color: '#B497CF' },
    { id: 'Resolved', x: 710, y: 70, label: 'RESOLVED', color: '#10b981' },
    { id: 'Verified', x: 870, y: 70, label: 'VERIFIED', color: '#059669' },
    { id: 'Closed', x: 990, y: 70, label: 'CLOSED', color: '#525252' },
    { id: 'Duplicate', x: 450, y: 200, label: 'DUPLICATE', color: '#525252' },
    { id: 'WontFix', x: 650, y: 200, label: 'WONTFIX', color: '#dc2626' }
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
    <div className="bg-[#0d0d0d] border-2 border-foreground p-4 shadow-brutalist space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-xs font-bold font-mono text-foreground uppercase tracking-wider flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-[#B497CF]" />
            <span>// WORKFLOW FINITE STATE MACHINE ENGINE</span>
          </h3>
          <p className="text-[10px] font-mono text-muted-foreground uppercase">
            DECLARATIVE STATE MACHINE SCHEMA WITH PERMISSIONED GUARDS & CRYPTO SEALS
          </p>
        </div>

        <div className="flex items-center gap-4 text-[10px] font-mono text-muted-foreground uppercase">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-foreground" /> ACTIVE STATE
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-[#B497CF]" /> GUARDED TRANSITION
          </span>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="w-full overflow-x-auto bg-black p-3 border-2 border-border">
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
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#737373" />
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
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#B497CF" />
            </marker>
          </defs>

          {/* Render All Background Transitions */}
          {workflow.transitions.map((t, i) => {
            if (t.from === '*') return null;
            const isHovered = hoveredNode === t.from || hoveredNode === t.to;
            const path = getPath(t.from, t.to);
            if (!path) return null;

            return (
              <g key={i}>
                <path
                  d={path}
                  fill="none"
                  stroke={isHovered ? '#B497CF' : '#262626'}
                  strokeWidth={isHovered ? 2.5 : 1.5}
                  strokeDasharray={t.guards ? '4 3' : undefined}
                  markerEnd={isHovered ? 'url(#arrow-active)' : 'url(#arrow)'}
                  className="transition-all duration-300"
                />
              </g>
            );
          })}

          {/* Render State Nodes */}
          {nodes.map((node) => {
            const isSelected = activeState === node.id;
            const isHovered = hoveredNode === node.id;
            const isConnected = outgoingTransitions.some((t) => t.to === node.id);

            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
                onClick={() => onSelectState && onSelectState(node.id)}
                className="cursor-pointer transition-all"
              >
                {/* Node Box */}
                <rect
                  x="-55"
                  y="-22"
                  width="110"
                  height="44"
                  rx="0"
                  fill={isHovered || isSelected ? '#080808' : '#0d0d0d'}
                  stroke={isSelected ? '#F2F1EA' : isHovered ? '#B497CF' : isConnected ? '#B497CF' : '#262626'}
                  strokeWidth={isSelected || isHovered ? 2.5 : 1.5}
                  className="transition-all"
                />

                {/* State Label */}
                <text
                  x="0"
                  y="4"
                  textAnchor="middle"
                  fill={isSelected ? '#FFFFFF' : isHovered ? '#B497CF' : '#F2F1EA'}
                  fontSize="10"
                  fontWeight="bold"
                  fontFamily="JetBrains Mono, monospace"
                  className="pointer-events-none uppercase tracking-wider"
                >
                  {node.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Selected / Hovered Transition Inspector */}
      {hoveredNode && (
        <div className="p-3 bg-black border border-border text-xs font-mono">
          <span className="text-muted-foreground uppercase font-bold">
            // ACTIVE NODE: <strong className="text-foreground">{hoveredNode.toUpperCase()}</strong>
          </span>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {outgoingTransitions.map((t, i) => (
              <div
                key={i}
                className="p-1.5 bg-[#0d0d0d] border border-border text-[10px] text-foreground uppercase flex items-center gap-1.5"
              >
                <span>→ {t.to}</span>
                {t.guards && (
                  <span className="px-1 py-0.2 bg-[#B497CF] text-background font-bold text-[9px]">
                    GUARDED
                  </span>
                )}
                {t.roles && (
                  <span className="px-1 py-0.2 bg-[#222] text-foreground text-[9px]">
                    ROLES: {t.roles.join(', ')}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

import React from 'react';
import { ShieldAlert, ShieldCheck, AlertTriangle, Activity, Lock } from 'lucide-react';

interface ThreatPulseBadgeProps {
  level: 'CRITICAL' | 'HIGH' | 'WARN' | 'SECURE' | 'CONFIDENTIAL';
  label?: string;
  showIcon?: boolean;
}

export const ThreatPulseBadge: React.FC<ThreatPulseBadgeProps> = ({
  level,
  label,
  showIcon = true
}) => {
  switch (level) {
    case 'CRITICAL':
      return (
        <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-md bg-red-950/80 border border-red-500/50 text-red-300 font-mono text-[10px] font-bold shadow-glow-red animate-pulse">
          {showIcon && <ShieldAlert className="w-3 h-3 text-red-400" />}
          <span>{label || 'CRITICAL THREAT'}</span>
        </span>
      );
    case 'CONFIDENTIAL':
      return (
        <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-md bg-purple-950/80 border border-purple-500/50 text-purple-300 font-mono text-[10px] font-bold shadow-glow-purple">
          {showIcon && <Lock className="w-3 h-3 text-purple-400" />}
          <span>{label || 'SECURITY CORE ONLY'}</span>
        </span>
      );
    case 'HIGH':
      return (
        <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-md bg-orange-950/80 border border-orange-500/50 text-orange-300 font-mono text-[10px] font-bold">
          {showIcon && <AlertTriangle className="w-3 h-3 text-orange-400" />}
          <span>{label || 'HIGH PRIORITY'}</span>
        </span>
      );
    case 'WARN':
      return (
        <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-md bg-amber-950/80 border border-amber-500/50 text-amber-300 font-mono text-[10px] font-bold">
          {showIcon && <AlertTriangle className="w-3 h-3 text-amber-400" />}
          <span>{label || 'REVIEW STALL'}</span>
        </span>
      );
    case 'SECURE':
    default:
      return (
        <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-md bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 font-mono text-[10px] font-bold">
          {showIcon && <ShieldCheck className="w-3 h-3 text-emerald-400" />}
          <span>{label || 'SLA COMPLIANT'}</span>
        </span>
      );
  }
};

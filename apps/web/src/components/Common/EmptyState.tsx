import React from 'react';
import { LucideIcon, Inbox, AlertCircle } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  onAction,
  className = ''
}) => {
  return (
    <div className={`p-12 rounded-2xl bg-surface-50/60 border border-slate-800/80 text-center flex flex-col items-center justify-center space-y-3 ${className}`}>
      <div className="w-12 h-12 rounded-2xl bg-surface-100 border border-slate-700/80 flex items-center justify-center text-slate-400 shadow-inner">
        <Icon className="w-6 h-6 stroke-[1.75]" />
      </div>
      <div className="space-y-1 max-w-sm">
        <h3 className="text-sm font-bold text-white">{title}</h3>
        <p className="text-xs text-slate-400 leading-relaxed">{description}</p>
      </div>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-2 px-3.5 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-500 text-white text-xs font-semibold shadow-glow-primary transition-all active:scale-95"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

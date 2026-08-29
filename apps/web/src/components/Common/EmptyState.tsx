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
    <div className={`p-10 bg-[#0d0d0d] border-2 border-border text-center flex flex-col items-center justify-center space-y-3 font-mono shadow-brutalist ${className}`}>
      <div className="w-10 h-10 bg-black border-2 border-border flex items-center justify-center text-muted-foreground">
        <Icon className="w-5 h-5" />
      </div>
      <div className="space-y-1 max-w-sm">
        <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">{title}</h3>
        <p className="text-[11px] text-muted-foreground leading-relaxed uppercase">{description}</p>
      </div>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-2 px-3 py-1 bg-foreground text-background font-bold text-xs uppercase hover:bg-white transition-all"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

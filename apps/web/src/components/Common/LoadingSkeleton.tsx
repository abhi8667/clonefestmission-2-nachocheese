import React from 'react';

export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 8 }) => {
  return (
    <div className="w-full rounded-xl border border-slate-800/90 bg-surface-50/80 overflow-hidden shadow-xl animate-pulse">
      <div className="h-10 bg-surface-100/90 border-b border-slate-800 flex items-center px-4 gap-4">
        <div className="w-4 h-4 bg-slate-800 rounded" />
        <div className="w-12 h-3 bg-slate-800 rounded" />
        <div className="w-8 h-3 bg-slate-800 rounded" />
        <div className="w-8 h-3 bg-slate-800 rounded" />
        <div className="w-1/3 h-3 bg-slate-800 rounded" />
        <div className="w-20 h-3 bg-slate-800 rounded" />
        <div className="w-16 h-3 bg-slate-800 rounded" />
        <div className="w-24 h-3 bg-slate-800 rounded" />
      </div>
      <div className="divide-y divide-slate-800/60 p-1">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="py-3 px-4 flex items-center gap-4">
            <div className="w-4 h-4 bg-slate-800/80 rounded" />
            <div className="w-12 h-3.5 bg-primary-500/10 rounded font-mono" />
            <div className="w-4 h-4 bg-slate-800 rounded-full" />
            <div className="w-8 h-3.5 bg-slate-800/60 rounded" />
            <div className="w-2/5 h-3.5 bg-slate-700/50 rounded" />
            <div className="w-20 h-4 bg-slate-800/70 rounded-full" />
            <div className="w-16 h-3.5 bg-slate-800/50 rounded" />
            <div className="w-24 h-3.5 bg-slate-800/50 rounded" />
            <div className="w-14 h-3 bg-slate-800/40 rounded ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
};

export const CardSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-4 rounded-xl bg-surface-50/90 border border-slate-800 space-y-2">
          <div className="w-20 h-2.5 bg-slate-800 rounded" />
          <div className="w-12 h-6 bg-slate-700/60 rounded" />
          <div className="w-24 h-2 bg-slate-800/40 rounded" />
        </div>
      ))}
    </div>
  );
};

export const ChartSkeleton: React.FC = () => {
  return (
    <div className="p-5 rounded-2xl bg-surface-50/90 border border-slate-800 shadow-xl space-y-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <div className="w-48 h-4 bg-slate-700 rounded" />
          <div className="w-64 h-2.5 bg-slate-800 rounded" />
        </div>
        <div className="w-32 h-4 bg-slate-800 rounded" />
      </div>
      <div className="h-64 w-full bg-surface-100/60 rounded-xl p-4 flex items-end gap-2 border border-slate-800/60">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 bg-slate-800/60 rounded-t"
            style={{ height: `${20 + ((i * 17) % 75)}%` }}
          />
        ))}
      </div>
    </div>
  );
};

export const DetailSkeleton: React.FC = () => {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="w-20 h-4 bg-primary-500/20 rounded" />
          <div className="w-96 h-6 bg-slate-700 rounded" />
        </div>
        <div className="w-28 h-8 bg-slate-800 rounded-lg" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 space-y-4">
          <div className="h-28 bg-surface-100 rounded-xl" />
          <div className="h-40 bg-surface-100 rounded-xl" />
        </div>
        <div className="space-y-3">
          <div className="h-32 bg-surface-100 rounded-xl" />
          <div className="h-32 bg-surface-100 rounded-xl" />
        </div>
      </div>
    </div>
  );
};

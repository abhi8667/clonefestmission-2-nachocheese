import React, { createContext, useContext, useCallback, useState, useRef, useEffect } from 'react';
import { CheckCircle2, AlertTriangle, Info, X, Bot, GitCommit, GitPullRequest, Flag, Zap } from 'lucide-react';

export type ToastKind =
  | 'success'
  | 'error'
  | 'info'
  | 'warning'
  | 'automated'
  | 'flag'
  | 'webhook';

export interface Toast {
  id: string;
  kind: ToastKind;
  title: string;
  body?: string;
  durationMs?: number;
}

interface ToastContextType {
  addToast: (t: Omit<Toast, 'id'>) => void;
}

const ToastContext = createContext<ToastContextType>({ addToast: () => {} });

export const useToast = () => useContext(ToastContext);

/* ─── Individual toast card ─── */
const ICONS: Record<ToastKind, React.ReactNode> = {
  success:   <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />,
  error:     <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />,
  info:      <Info className="w-4 h-4 text-sky-400 shrink-0" />,
  warning:   <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />,
  automated: <Bot className="w-4 h-4 text-cyan-400 shrink-0" />,
  flag:      <Flag className="w-4 h-4 text-violet-400 shrink-0" />,
  webhook:   <Zap className="w-4 h-4 text-amber-300 shrink-0" />,
};

const BORDERS: Record<ToastKind, string> = {
  success:   'border-emerald-500/40',
  error:     'border-rose-500/40',
  info:      'border-sky-500/40',
  warning:   'border-amber-500/40',
  automated: 'border-cyan-500/40',
  flag:      'border-violet-500/40',
  webhook:   'border-amber-400/40',
};

const GLOWS: Record<ToastKind, string> = {
  success:   '0 0 20px -6px rgba(16,185,129,0.45)',
  error:     '0 0 20px -6px rgba(244,63,94,0.45)',
  info:      '0 0 20px -6px rgba(14,165,233,0.4)',
  warning:   '0 0 20px -6px rgba(245,158,11,0.4)',
  automated: '0 0 20px -6px rgba(6,182,212,0.5)',
  flag:      '0 0 20px -6px rgba(139,92,246,0.45)',
  webhook:   '0 0 20px -6px rgba(245,158,11,0.45)',
};

function ToastCard({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    // mount → slide in
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  const dismiss = useCallback(() => {
    setLeaving(true);
    setTimeout(() => onDismiss(toast.id), 320);
  }, [toast.id, onDismiss]);

  useEffect(() => {
    const dur = toast.durationMs ?? 4500;
    const t = setTimeout(dismiss, dur);
    return () => clearTimeout(t);
  }, [dismiss, toast.durationMs]);

  return (
    <div
      role="alert"
      aria-live="polite"
      onClick={dismiss}
      style={{
        boxShadow: GLOWS[toast.kind],
        transform: visible && !leaving ? 'translateX(0) scale(1)' : 'translateX(120%) scale(0.95)',
        opacity: visible && !leaving ? 1 : 0,
        transition: 'transform 0.32s cubic-bezier(0.16,1,0.3,1), opacity 0.28s ease',
      }}
      className={`
        relative w-80 max-w-[90vw] rounded-xl
        bg-surface-100/95 backdrop-blur-md
        border ${BORDERS[toast.kind]}
        px-3.5 py-3 cursor-pointer select-none
        hover:brightness-110 transition-[filter] duration-150
      `}
    >
      {/* Progress bar */}
      <div
        className="absolute bottom-0 left-0 h-[2px] rounded-bl-xl rounded-br-xl bg-current opacity-30"
        style={{
          width: '100%',
          animation: `shrink ${toast.durationMs ?? 4500}ms linear forwards`,
        }}
      />

      <div className="flex items-start gap-2.5">
        <span className="mt-0.5">{ICONS[toast.kind]}</span>

        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-white leading-snug">{toast.title}</p>
          {toast.body && (
            <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{toast.body}</p>
          )}
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); dismiss(); }}
          className="text-slate-500 hover:text-slate-300 transition-colors mt-0.5 shrink-0"
          aria-label="Dismiss notification"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

/* ─── Provider ─── */
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const addToast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = `toast-${++counter.current}`;
    setToasts((prev) => [...prev.slice(-4), { ...t, id }]); // max 5 visible
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}

      {/* Portal-style fixed container: bottom-right */}
      <div
        className="fixed bottom-5 right-5 z-[200] flex flex-col gap-2.5 items-end pointer-events-none"
        aria-label="Notifications"
      >
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <ToastCard toast={t} onDismiss={dismiss} />
          </div>
        ))}
      </div>

      {/* keyframe for progress bar */}
      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>
    </ToastContext.Provider>
  );
};

import React, { useEffect } from 'react';
import { X, Command, ArrowUp, ArrowDown, CornerDownLeft, Keyboard } from 'lucide-react';
import { useFocusTrap } from '../../hooks/useFocusTrap.ts';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  {
    section: 'Global',
    items: [
      { keys: ['⌘', 'K'], desc: 'Open command palette' },
      { keys: ['⌘', 'N'], desc: 'File a new bug' },
      { keys: ['?'], desc: 'Show this keyboard shortcuts reference' },
      { keys: ['Esc'], desc: 'Close modal / dismiss overlay' },
    ],
  },
  {
    section: 'Bug List',
    items: [
      { keys: ['j'], desc: 'Move selection down one row' },
      { keys: ['k'], desc: 'Move selection up one row' },
      { keys: ['Enter'], desc: 'Open selected bug detail' },
      { keys: ['g', 'i'], desc: 'Go to Inbox' },
      { keys: ['g', 'a'], desc: 'Go to Flow Analytics' },
      { keys: ['g', 'b'], desc: 'Go back to Bug List' },
    ],
  },
  {
    section: 'Bug Detail',
    items: [
      { keys: ['Tab'], desc: 'Cycle between tabs (Comments → Relationships → Flags → Git → Audit)' },
      { keys: ['⌘', 'Enter'], desc: 'Post comment' },
      { keys: ['←'], desc: 'Go back to list' },
    ],
  },
  {
    section: 'Inbox',
    items: [
      { keys: ['I'], desc: 'Switch to Incoming queue' },
      { keys: ['O'], desc: 'Switch to Outgoing queue' },
    ],
  },
];

export const KeyboardShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  const trapRef = useFocusTrap<HTMLDivElement>({
    isOpen,
    onClose
  });

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/65 backdrop-blur-sm p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-modal-title"
        className="w-full max-w-xl bg-surface-50 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-surface-100/90">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary-600/30 border border-primary-500/40 flex items-center justify-center">
              <Keyboard className="w-3.5 h-3.5 text-primary-300" />
            </div>
            <div>
              <h2 id="shortcuts-modal-title" className="text-sm font-bold text-white">Keyboard Shortcuts</h2>
              <p className="text-[11px] text-slate-400">Press <Kbd keys={['?']} inline /> anywhere to reopen</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 transition-all"
            aria-label="Close keyboard shortcuts"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-6 max-h-[70vh] overflow-y-auto">
          {SHORTCUTS.map((section) => (
            <div key={section.section}>
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2.5">
                {section.section}
              </h3>
              <div className="space-y-2">
                {section.items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-3">
                    <span className="text-xs text-slate-300 leading-snug">{item.desc}</span>
                    <Kbd keys={item.keys} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-surface-100/60 text-[11px] text-slate-500 text-center">
          Click anywhere outside or press <Kbd keys={['Esc']} inline /> to close
        </div>
      </div>
    </div>
  );
};

/* ── Reusable Kbd chip ── */
function Kbd({ keys, inline }: { keys: string[]; inline?: boolean }) {
  return (
    <span className={`flex items-center gap-1 ${inline ? 'inline-flex' : 'shrink-0'}`}>
      {keys.map((k, i) => (
        <kbd
          key={i}
          className="inline-flex items-center justify-center min-w-[1.5rem] h-5 px-1.5 rounded text-[10px] font-mono font-semibold text-slate-200 bg-slate-800 border border-slate-600 shadow-sm"
        >
          {k}
        </kbd>
      ))}
    </span>
  );
}

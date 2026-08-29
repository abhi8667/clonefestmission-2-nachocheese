import React from 'react';
import { X, Command, ArrowUp, ArrowDown, CornerDownLeft, Keyboard } from 'lucide-react';
import { useFocusTrap } from '../../hooks/useFocusTrap.ts';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  {
    section: 'GLOBAL',
    items: [
      { keys: ['⌘', 'K'], desc: 'OPEN COMMAND PALETTE' },
      { keys: ['⌘', 'N'], desc: 'FILE A NEW BUG' },
      { keys: ['`'], desc: 'TOGGLE SOC TELEMETRY TERMINAL' },
      { keys: ['?'], desc: 'SHOW KEYBOARD SHORTCUTS' },
      { keys: ['ESC'], desc: 'CLOSE MODAL / DISMISS OVERLAY' },
    ],
  },
  {
    section: 'INCIDENT MATRIX',
    items: [
      { keys: ['J'], desc: 'MOVE SELECTION DOWN ONE ROW' },
      { keys: ['K'], desc: 'MOVE SELECTION UP ONE ROW' },
      { keys: ['ENTER'], desc: 'OPEN SELECTED INCIDENT DOSSIER' },
      { keys: ['G', 'I'], desc: 'GO TO CLEARANCE INBOX' },
      { keys: ['G', 'A'], desc: 'GO TO FLOW ANALYTICS' },
      { keys: ['G', 'B'], desc: 'GO TO INCIDENT MATRIX' },
    ],
  },
  {
    section: 'INCIDENT DOSSIER',
    items: [
      { keys: ['TAB'], desc: 'CYCLE BETWEEN TABS' },
      { keys: ['⌘', 'ENTER'], desc: 'POST AUDIT NOTE' },
      { keys: ['←'], desc: 'GO BACK TO LIST' },
    ],
  },
  {
    section: 'CLEARANCE INBOX',
    items: [
      { keys: ['I'], desc: 'SWITCH TO INCOMING QUEUE' },
      { keys: ['O'], desc: 'SWITCH TO OUTGOING QUEUE' },
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
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in font-mono"
      onClick={onClose}
    >
      <div
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-modal-title"
        className="w-full max-w-xl bg-[#080808] border-2 border-foreground shadow-brutalist overflow-hidden animate-slide-up text-foreground"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Brutalist Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-[#121212] border-b-2 border-foreground text-[10px]">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 bg-[#ea580c]" />
            <span className="h-2 w-2 bg-foreground" />
            <span className="font-bold uppercase tracking-wider">// REFERENCE // KEYBOARD_HOTKEYS</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 border border-border hover:border-foreground text-muted-foreground hover:text-foreground bg-[#080808]"
            aria-label="Close keyboard shortcuts"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto">
          {SHORTCUTS.map((section) => (
            <div key={section.section} className="p-3 bg-[#0d0d0d] border-2 border-border space-y-2">
              <h3 className="text-[9px] font-bold uppercase tracking-widest text-[#ea580c]">
                // {section.section}
              </h3>
              <div className="space-y-1.5">
                {section.items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-[10px] text-foreground leading-snug uppercase">{item.desc}</span>
                    <Kbd keys={item.keys} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t-2 border-border bg-[#0d0d0d] text-[10px] text-muted-foreground text-center uppercase">
          PRESS <Kbd keys={['ESC']} inline /> OR CLICK OUTSIDE TO DISMISS
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
          className="inline-flex items-center justify-center min-w-[1.2rem] h-4 px-1 text-[9px] font-mono font-bold text-foreground bg-black border border-border"
        >
          {k}
        </kbd>
      ))}
    </span>
  );
}

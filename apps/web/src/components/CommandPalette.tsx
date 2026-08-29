import React, { useState, useEffect, useRef } from 'react';
import { Search, Layers, Inbox, Activity, Plus, GitPullRequest, ArrowRight, UserCheck, Shield, Key } from 'lucide-react';
import { Bug } from '@triarc/shared-types';
import { useAuth } from '../context/AuthContext.tsx';
import { useFocusTrap } from '../hooks/useFocusTrap.ts';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  bugs: Bug[];
  onSelectBug: (bugId: number) => void;
  setActiveTab: (tab: 'bugs' | 'inbox' | 'analytics' | 'admin') => void;
  openNewBugModal: () => void;
  openWebhookSimulator: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  bugs,
  onSelectBug,
  setActiveTab,
  openNewBugModal,
  openWebhookSimulator
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { currentUser, users, switchUserById } = useAuth();
  const trapRef = useFocusTrap<HTMLDivElement>({
    isOpen,
    onClose,
    initialFocusRef: inputRef
  });

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Static actions
  const staticActions = [
    { id: 'act_new', label: 'File a New Bug / Incident Report', icon: Plus, action: () => { onClose(); openNewBugModal(); } },
    { id: 'act_inbox', label: 'Go to Clearance & Approval Inbox', icon: Inbox, action: () => { onClose(); setActiveTab('inbox'); } },
    { id: 'act_cfd', label: 'Go to Threat Flow Analytics & CFD', icon: Activity, action: () => { onClose(); setActiveTab('analytics'); } },
    ...(currentUser?.role === 'admin' ? [{ id: 'act_admin', label: 'Go to Administration & Governance Console', icon: Key, action: () => { onClose(); setActiveTab('admin'); } }] : []),
    { id: 'act_sim', label: 'Open GitHub Webhook Telemetry Simulator', icon: GitPullRequest, action: () => { onClose(); openWebhookSimulator(); } },
  ];

  // User switch actions
  const userActions = users.map((u) => ({
    id: `user_${u.id}`,
    label: `Switch Operator Clearance: ${u.name} (@${u.username} - ${u.role.toUpperCase()})`,
    icon: UserCheck,
    action: () => {
      switchUserById(u.id);
      onClose();
    }
  }));

  const allActions = [...staticActions, ...userActions];

  const filteredActions = allActions.filter((a) =>
    a.label.toLowerCase().includes(query.toLowerCase())
  );

  const filteredBugs = bugs.filter(
    (b) =>
      b.title.toLowerCase().includes(query.toLowerCase()) ||
      b.id.toString().includes(query) ||
      b.component_id.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 8);

  const allItems = [
    ...filteredActions.map((a) => ({ type: 'action', data: a })),
    ...filteredBugs.map((b) => ({ type: 'bug', data: b }))
  ];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, allItems.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + allItems.length) % Math.max(1, allItems.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const current = allItems[selectedIndex];
      if (current) {
        if (current.type === 'action') {
          (current.data as any).action();
        } else {
          onSelectBug((current.data as Bug).id);
          onClose();
        }
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/80 backdrop-blur-md p-4 animate-fade-in" onClick={onClose}>
      <div
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-label="Tactical Command Palette"
        className="w-full max-w-2xl bg-slate-950 border border-cyan-500/30 rounded-2xl shadow-2xl overflow-hidden animate-slide-up cyber-corners font-mono"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-800 bg-slate-950/90">
          <Search className="w-5 h-5 text-cyan-400" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or search incidents by #ID, title, vector..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            className="flex-1 bg-transparent border-none outline-none text-xs text-white placeholder-slate-500 font-mono"
          />
          <kbd className="px-2 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-900 border border-slate-700 rounded-md">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 space-y-1" role="listbox">
          {filteredActions.length > 0 && (
            <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
              OPERATIONAL COMMANDS & OPERATORS
            </div>
          )}
          {filteredActions.map((item, idx) => {
            const Icon = item.icon;
            const isSelected = selectedIndex === idx;
            return (
              <button
                type="button"
                role="option"
                aria-selected={isSelected}
                key={item.id}
                onClick={item.action}
                className={`w-full text-left flex items-center justify-between px-3 py-2.5 rounded-xl text-xs cursor-pointer transition-all ${
                  isSelected ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-glow-cyan' : 'text-slate-300 hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4 text-cyan-400" />
                  <span className="font-semibold">{item.label}</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
              </button>
            );
          })}

          {filteredBugs.length > 0 && (
            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-2">
              MATCHING TELEMETRY INCIDENTS
            </div>
          )}
          {filteredBugs.map((bug, bIdx) => {
            const itemIdx = filteredActions.length + bIdx;
            const isSelected = selectedIndex === itemIdx;
            return (
              <button
                type="button"
                role="option"
                aria-selected={isSelected}
                key={bug.id}
                onClick={() => {
                  onSelectBug(bug.id);
                  onClose();
                }}
                className={`w-full text-left flex items-center justify-between px-3 py-2.5 rounded-xl text-xs cursor-pointer transition-all ${
                  isSelected ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-glow-cyan' : 'text-slate-300 hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-mono text-cyan-400 font-bold">#{bug.id}</span>
                  <span className="font-medium text-slate-200 truncate max-w-md">{bug.title}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="px-2 py-0.5 rounded bg-slate-900 text-[10px] text-slate-400 font-mono border border-slate-800">
                    {bug.component_id}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-cyan-950 text-[10px] text-cyan-300 border border-cyan-800">
                    {bug.status}
                  </span>
                </div>
              </button>
            );
          })}

          {allItems.length === 0 && (
            <div className="p-8 text-center text-slate-500 text-xs font-mono">
              No matching incidents or commands found for "{query}".
            </div>
          )}
        </div>

        {/* Footer shortcuts helper */}
        <div className="px-4 py-2 border-t border-slate-800 bg-slate-950/80 text-[10px] font-mono text-slate-400 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Execute</span>
            <span>Esc Abort</span>
          </div>
          <span>TRIARC TACTICAL HUD COMMAND</span>
        </div>
      </div>
    </div>
  );
};

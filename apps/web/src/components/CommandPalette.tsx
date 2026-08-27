import React, { useState, useEffect, useRef } from 'react';
import { Search, Layers, Inbox, Activity, Plus, GitPullRequest, ArrowRight, UserCheck } from 'lucide-react';
import { Bug } from '@triarc/shared-types';
import { useAuth } from '../context/AuthContext.tsx';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  bugs: Bug[];
  onSelectBug: (bugId: number) => void;
  setActiveTab: (tab: 'bugs' | 'inbox' | 'analytics') => void;
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
  const { users, switchUserById } = useAuth();

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
    { id: 'act_new', label: 'File a New Bug', icon: Plus, action: () => { onClose(); openNewBugModal(); } },
    { id: 'act_inbox', label: 'Go to Request Inbox', icon: Inbox, action: () => { onClose(); setActiveTab('inbox'); } },
    { id: 'act_cfd', label: 'Go to Flow Analytics & CFD', icon: Activity, action: () => { onClose(); setActiveTab('analytics'); } },
    { id: 'act_sim', label: 'Open GitHub Webhook Simulator', icon: GitPullRequest, action: () => { onClose(); openWebhookSimulator(); } },
  ];

  // User switch actions
  const userActions = users.map((u) => ({
    id: `user_${u.id}`,
    label: `Switch user to ${u.name} (${u.role})`,
    icon: UserCheck,
    action: () => { switchUserById(u.id); onClose(); }
  }));

  // Filtered bugs
  const filteredBugs = bugs
    .filter((b) =>
      b.title.toLowerCase().includes(query.toLowerCase()) ||
      b.id.toString().includes(query) ||
      b.component_id.toLowerCase().includes(query.toLowerCase())
    )
    .slice(0, 8);

  const filteredActions = [...staticActions, ...userActions].filter((a) =>
    a.label.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 4);

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
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/60 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
      <div
        className="w-full max-w-2xl bg-surface-100 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-800 bg-surface-50/60">
          <Search className="w-5 h-5 text-primary-400" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or search bugs by ID / title..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            className="flex-1 bg-transparent border-none outline-none text-sm text-white placeholder-slate-500 font-sans"
          />
          <kbd className="px-2 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-800 border border-slate-700 rounded">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 space-y-1">
          {filteredActions.length > 0 && (
            <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Actions & Navigation
            </div>
          )}
          {filteredActions.map((item, idx) => {
            const Icon = item.icon;
            const isSelected = selectedIndex === idx;
            return (
              <div
                key={item.id}
                onClick={item.action}
                className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs cursor-pointer transition-all ${
                  isSelected ? 'bg-primary-600/20 text-white border border-primary-500/30' : 'text-slate-300 hover:bg-surface-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4 text-primary-400" />
                  <span className="font-medium">{item.label}</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
              </div>
            );
          })}

          {filteredBugs.length > 0 && (
            <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 mt-2">
              Bugs
            </div>
          )}
          {filteredBugs.map((bug, bIdx) => {
            const itemIdx = filteredActions.length + bIdx;
            const isSelected = selectedIndex === itemIdx;
            return (
              <div
                key={bug.id}
                onClick={() => {
                  onSelectBug(bug.id);
                  onClose();
                }}
                className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs cursor-pointer transition-all ${
                  isSelected ? 'bg-primary-600/20 text-white border border-primary-500/30' : 'text-slate-300 hover:bg-surface-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-primary-400 font-bold">#{bug.id}</span>
                  <span className="font-medium text-slate-200 truncate max-w-md">{bug.title}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400 font-mono">
                    {bug.component_id}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-primary-950 text-[10px] text-primary-300 border border-primary-800">
                    {bug.status}
                  </span>
                </div>
              </div>
            );
          })}

          {allItems.length === 0 && (
            <div className="p-8 text-center text-slate-500 text-xs">
              No matching bugs or actions found for "{query}".
            </div>
          )}
        </div>

        {/* Footer shortcuts helper */}
        <div className="px-4 py-2 border-t border-slate-800 bg-surface-50/40 text-[11px] text-slate-500 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>Esc Close</span>
          </div>
          <span>Triarc Keyboard Command Center</span>
        </div>
      </div>
    </div>
  );
};

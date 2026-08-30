import React, { useState, useEffect, useRef } from 'react';
import { Search, Layers, Inbox, Activity, Plus, GitPullRequest, ArrowRight, UserCheck, Shield, Key } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Bug } from '@triarc/shared-types';
import { useAuth } from '../context/AuthContext.tsx';
import { useFocusTrap } from '../hooks/useFocusTrap.ts';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  bugs?: Bug[];
  onSelectBug?: (bugId: number) => void;
  setActiveTab?: (tab: 'bugs' | 'inbox' | 'analytics' | 'admin') => void;
  openNewBugModal: () => void;
  openWebhookSimulator: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  bugs = [],
  onSelectBug,
  openNewBugModal,
  openWebhookSimulator
}) => {
  const navigate = useNavigate();
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
    { id: 'act_projects', label: 'GO TO PROJECT WORKSPACES LIST', icon: Layers, action: () => { onClose(); navigate('/projects'); } },
    { id: 'act_new', label: 'FILE A NEW BUG / INCIDENT REPORT', icon: Plus, action: () => { onClose(); openNewBugModal(); } },
    { id: 'act_inbox', label: 'GO TO CLEARANCE & APPROVAL INBOX', icon: Inbox, action: () => { onClose(); navigate('/inbox'); } },
    { id: 'act_core', label: 'OPEN PROJECT: CORE PLATFORM', icon: Layers, action: () => { onClose(); navigate('/projects/CORE'); } },
    { id: 'act_pay', label: 'OPEN PROJECT: PAYMENT GATEWAY (PAY)', icon: Layers, action: () => { onClose(); navigate('/projects/PAY'); } },
    { id: 'act_sec', label: 'OPEN PROJECT: ZERO TRUST SECURITY (SEC)', icon: Shield, action: () => { onClose(); navigate('/projects/SEC'); } },
    ...(currentUser?.role === 'admin' ? [{ id: 'act_admin', label: 'GO TO ADMINISTRATION & GOVERNANCE CONSOLE', icon: Key, action: () => { onClose(); navigate('/admin'); } }] : []),
    { id: 'act_sim', label: 'OPEN GITHUB WEBHOOK TELEMETRY SIMULATOR', icon: GitPullRequest, action: () => { onClose(); openWebhookSimulator(); } },
  ];

  // User switch actions
  const userActions = users.map((u) => ({
    id: `user_${u.id}`,
    label: `SWITCH OPERATOR: ${u.name.toUpperCase()} (@${u.username.toUpperCase()} - ${u.role.toUpperCase()})`,
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
          const b = current.data as Bug;
          if (onSelectBug) {
            onSelectBug(b.id);
          } else {
            navigate(`/projects/${b.project_key || 'CORE'}/issues/${b.id}`);
          }
          onClose();
        }
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/80 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
      <div
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-label="Command Palette"
        className="w-full max-w-2xl bg-[#080808] border border-border shadow-2xl overflow-hidden animate-slide-up font-mono text-foreground rounded-sm"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Window Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-[#121212] border-b border-border text-[10px]">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 bg-[#B497CF] rounded-full" />
            <span className="font-bold uppercase tracking-wider text-foreground">COMMAND PALETTE (CTRL+K)</span>
          </div>
          <span className="text-muted-foreground uppercase">[ESC TO CLOSE]</span>
        </div>

        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border bg-[#0d0d0d]">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or search incidents by #ID or title..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            className="flex-1 bg-transparent border-none outline-none text-xs text-foreground placeholder-muted-foreground font-mono"
          />
          <kbd className="px-2 py-0.5 text-[9px] font-mono text-muted-foreground bg-black border border-border rounded-xs">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2.5 space-y-1" role="listbox">
          {filteredActions.length > 0 && (
            <div className="px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
              COMMANDS & OPERATORS
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
                className={`w-full text-left flex items-center justify-between px-3 py-2 text-xs cursor-pointer transition-all border ${isSelected
                    ? 'bg-foreground text-background border-foreground font-bold'
                    : 'text-foreground border-transparent hover:bg-[#141414]'
                  }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-3.5 h-3.5" />
                  <span className="uppercase">{item.label}</span>
                </div>
                <ArrowRight className="w-3 h-3" />
              </button>
            );
          })}

          {filteredBugs.length > 0 && (
            <div className="px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground mt-2">
              // MATCHING INCIDENTS
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
                  if (onSelectBug) {
                    onSelectBug(bug.id);
                  } else {
                    navigate(`/projects/${bug.project_key || 'CORE'}/issues/${bug.id}`);
                  }
                  onClose();
                }}
                className={`w-full text-left flex items-center justify-between px-3 py-2 text-xs cursor-pointer transition-all border ${isSelected
                    ? 'bg-foreground text-background border-foreground font-bold'
                    : 'text-foreground border-transparent hover:bg-[#141414]'
                  }`}
              >
                <div className="flex items-center gap-2 min-w-0 font-mono">
                  <span className="font-bold">#{bug.id}</span>
                  <span className="truncate max-w-md uppercase">{bug.title}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="px-1.5 py-0.2 bg-black text-[9px] border border-border uppercase">
                    {bug.component_id}
                  </span>
                  <span className="px-1.5 py-0.2 bg-[#B497CF] text-background text-[9px] font-bold uppercase">
                    {bug.status}
                  </span>
                </div>
              </button>
            );
          })}

          {allItems.length === 0 && (
            <div className="p-6 text-center text-muted-foreground text-xs font-mono uppercase">
              // ZERO MATCHING COMMANDS OR INCIDENTS FOUND FOR "{query}".
            </div>
          )}
        </div>

        {/* Footer shortcuts helper */}
        <div className="px-3 py-1.5 border-t-2 border-border bg-[#0d0d0d] text-[9px] font-mono text-muted-foreground flex items-center justify-between uppercase">
          <div className="flex items-center gap-3">
            <span>↑↓ NAVIGATE</span>
            <span>↵ EXECUTE</span>
            <span>ESC ABORT</span>
          </div>
          <span>TRIARC HUD</span>
        </div>
      </div>
    </div>
  );
};

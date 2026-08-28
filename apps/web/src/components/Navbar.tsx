import React, { useState } from 'react';
import {
  Layers,
  Inbox,
  Activity,
  Plus,
  GitPullRequest,
  Search,
  Command,
  Shield,
  User as UserIcon,
  ChevronDown,
  CheckCircle2,
  Radio,
  Keyboard
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useSSE } from '../context/SSEContext.tsx';

interface NavbarProps {
  activeTab: 'bugs' | 'inbox' | 'analytics';
  setActiveTab: (tab: 'bugs' | 'inbox' | 'analytics') => void;
  openNewBugModal: () => void;
  openWebhookSimulator: () => void;
  openCommandPalette: () => void;
  openKeyboardShortcuts?: () => void;
  inboxCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  openNewBugModal,
  openWebhookSimulator,
  openCommandPalette,
  openKeyboardShortcuts,
  inboxCount = 0
}) => {
  const { currentUser, users, switchUserById } = useAuth();
  const { isConnected } = useSSE();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'security':
        return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'triager':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'developer':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-surface-50/90 backdrop-blur-md border-b border-slate-800/80 px-4 lg:px-8 py-2.5 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Left: Brand + Navigation Tabs */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setActiveTab('bugs')}>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-cyan flex items-center justify-center shadow-glow-primary">
              <span className="font-extrabold font-mono text-white text-base tracking-tighter">▲</span>
            </div>
            <div className="flex flex-col">
              <span className="font-black font-mono tracking-wider text-base text-white flex items-center gap-1.5">
                TRIARC
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-primary-500/20 text-primary-300 border border-primary-500/30">
                  flow
                </span>
              </span>
            </div>
          </div>

          <nav className="flex items-center gap-1.5 ml-4">
            <button
              onClick={() => setActiveTab('bugs')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                activeTab === 'bugs'
                  ? 'bg-primary-600/20 text-primary-300 border border-primary-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Bugs
            </button>

            <button
              onClick={() => setActiveTab('inbox')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all relative ${
                activeTab === 'inbox'
                  ? 'bg-primary-600/20 text-primary-300 border border-primary-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Inbox className="w-3.5 h-3.5" />
              Request Inbox
              {inboxCount > 0 && (
                <span className="px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-accent-amber text-slate-950 animate-pulse">
                  {inboxCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                activeTab === 'analytics'
                  ? 'bg-primary-600/20 text-primary-300 border border-primary-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              Flow Analytics
            </button>
          </nav>
        </div>

        {/* Middle: Search / Command Palette trigger */}
        <div className="flex-1 max-w-md hidden md:block">
          <button
            onClick={openCommandPalette}
            className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-slate-400 bg-surface-100/90 hover:bg-surface-200/90 border border-slate-800 hover:border-slate-700 rounded-lg transition-all shadow-inner"
          >
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <span>Search bugs, commands, flags...</span>
            </div>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-800 rounded border border-slate-700">
              <Command className="w-2.5 h-2.5" /> K
            </kbd>
          </button>
        </div>

        {/* Right: Actions + Webhook Simulator + User Switcher */}
        <div className="flex items-center gap-3">
          {/* Live SSE indicator */}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50 animate-pulse' : 'bg-rose-500'}`} />
            <span className="hidden sm:inline">{isConnected ? 'Live' : 'Connecting'}</span>
          </div>

          {/* Webhook Simulator trigger */}
          <button
            onClick={openWebhookSimulator}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800/70 hover:bg-slate-700/80 border border-slate-700/60 flex items-center gap-1.5 transition-all"
            title="Simulate GitHub commit, PR, or review webhooks"
          >
            <GitPullRequest className="w-3.5 h-3.5 text-accent-cyan" />
            <span className="hidden sm:inline">Webhook Simulator</span>
          </button>

          {/* Keyboard Shortcuts Reference trigger */}
          {openKeyboardShortcuts && (
            <button
              onClick={openKeyboardShortcuts}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-800/70 hover:bg-slate-700/80 border border-slate-700/60 transition-all"
              title="Keyboard shortcuts (?)"
            >
              <Keyboard className="w-4 h-4" />
            </button>
          )}

          {/* New Bug button */}
          <button
            onClick={openNewBugModal}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 shadow-glow-primary flex items-center gap-1.5 transition-all transform active:scale-95"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>New Bug</span>
          </button>

          {/* Active User Switcher */}
          <div className="relative">
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-2 pl-2 pr-2.5 py-1 rounded-lg bg-surface-100 hover:bg-surface-200 border border-slate-800 hover:border-slate-700 transition-all text-left"
            >
              <div className="w-6 h-6 rounded-full bg-primary-600/40 border border-primary-500/50 flex items-center justify-center text-[11px] font-bold text-primary-200 overflow-hidden">
                {currentUser?.avatar_url ? (
                  <img src={currentUser.avatar_url} alt={currentUser.name} className="w-full h-full object-cover" />
                ) : (
                  currentUser?.name.charAt(0) || 'U'
                )}
              </div>
              <div className="hidden lg:flex flex-col">
                <span className="text-xs font-semibold text-slate-200 leading-tight">{currentUser?.name || 'Guest'}</span>
                <span className="text-[10px] text-slate-400 leading-none capitalize">{currentUser?.role || 'developer'}</span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
            </button>

            {/* Dropdown Menu */}
            {isUserMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-xl bg-surface-100 border border-slate-700 shadow-2xl p-2 z-50 animate-slide-up">
                <div className="px-2.5 py-2 border-b border-slate-800 mb-1">
                  <p className="text-xs font-bold text-white">Switch Demo User & Role</p>
                  <p className="text-[10px] text-slate-400">Controls permissions & transition guards</p>
                </div>
                <div className="space-y-1">
                  {users.map((u) => {
                    const isSelected = u.id === currentUser?.id;
                    return (
                      <button
                        key={u.id}
                        onClick={() => {
                          switchUserById(u.id);
                          setIsUserMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-all ${
                          isSelected ? 'bg-primary-600/20 text-white border border-primary-500/30' : 'text-slate-300 hover:bg-surface-200'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-300 overflow-hidden">
                            {u.avatar_url ? (
                              <img src={u.avatar_url} alt={u.name} className="w-full h-full object-cover" />
                            ) : (
                              u.name.charAt(0)
                            )}
                          </div>
                          <div className="text-left">
                            <p className="font-semibold">{u.name}</p>
                            <p className="text-[10px] text-slate-400">@{u.username}</p>
                          </div>
                        </div>
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border capitalize ${getRoleBadge(u.role)}`}>
                          {u.role}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

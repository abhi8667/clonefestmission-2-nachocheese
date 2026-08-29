import React, { useState, useEffect } from 'react';
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
  Keyboard,
  Bell,
  Check,
  Github,
  LogOut,
  Sparkles,
  Settings,
  Terminal,
  Cpu,
  Lock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useSSE } from '../context/SSEContext.tsx';
import { fetchNotifications, markNotificationRead, markAllNotificationsRead } from '../services/api.ts';

interface NavbarProps {
  activeTab: 'bugs' | 'inbox' | 'analytics' | 'admin';
  setActiveTab: (tab: 'bugs' | 'inbox' | 'analytics' | 'admin') => void;
  openNewBugModal: () => void;
  openWebhookSimulator: () => void;
  openImportModal: () => void;
  openCommandPalette: () => void;
  openKeyboardShortcuts?: () => void;
  onSelectBug?: (bugId: number) => void;
  inboxCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  openNewBugModal,
  openWebhookSimulator,
  openImportModal,
  openCommandPalette,
  openKeyboardShortcuts,
  onSelectBug,
  inboxCount = 0
}) => {
  const { currentUser, users, switchUserById } = useAuth();
  const { isConnected, lastEvent } = useSSE();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  const loadNotifications = async () => {
    try {
      const data = await fetchNotifications(false, currentUser?.id);
      setNotifications(data.notifications || []);
      setUnreadNotifCount(data.unread_count || 0);
    } catch (err) {
      // Ignore
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [currentUser]);

  useEffect(() => {
    if (lastEvent?.type === 'notification:created' || lastEvent?.type === 'bug:updated') {
      loadNotifications();
    }
  }, [lastEvent]);

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead(currentUser?.id);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: 1 })));
      setUnreadNotifCount(0);
    } catch (err) {}
  };

  const handleSelectNotification = async (notif: any) => {
    try {
      await markNotificationRead(notif.id, currentUser?.id);
      setNotifications((prev) => prev.map((n) => (n.id === notif.id ? { ...n, read: 1 } : n)));
      setUnreadNotifCount((prev) => Math.max(0, prev - 1));
      if (notif.bug_id && onSelectBug) {
        onSelectBug(notif.bug_id);
      }
      setIsNotifOpen(false);
    } catch (err) {}
  };

  const getClearanceLevel = (role?: string) => {
    switch (role) {
      case 'admin':
        return { label: 'LEVEL 5 - SEC OPS LEAD', color: 'text-purple-400 border-purple-500/40 bg-purple-950/60' };
      case 'security':
        return { label: 'LEVEL 4 - SECURITY CORE', color: 'text-red-400 border-red-500/40 bg-red-950/60' };
      case 'triager':
        return { label: 'LEVEL 3 - INCIDENT TRIAGE', color: 'text-amber-400 border-amber-500/40 bg-amber-950/60' };
      case 'developer':
        return { label: 'LEVEL 2 - CORE DEV', color: 'text-cyan-400 border-cyan-500/40 bg-cyan-950/60' };
      case 'reporter':
      default:
        return { label: 'LEVEL 1 - FIELD AGENT', color: 'text-emerald-400 border-emerald-500/40 bg-emerald-950/60' };
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-950/80 text-purple-300 border-purple-500/40';
      case 'security':
        return 'bg-red-950/80 text-red-300 border-red-500/40';
      case 'triager':
        return 'bg-amber-950/80 text-amber-300 border-amber-500/40';
      case 'developer':
        return 'bg-cyan-950/80 text-cyan-300 border-cyan-500/40';
      default:
        return 'bg-slate-900 text-slate-300 border-slate-700';
    }
  };

  const clearance = getClearanceLevel(currentUser?.role);

  return (
    <header className="sticky top-0 z-40 bg-slate-950/85 backdrop-blur-xl border-b border-cyan-500/15 px-4 lg:px-8 py-2.5 transition-all shadow-cyber-card cyber-scanline-overlay">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Left: Brand HUD + Navigation Tabs */}
        <div className="flex items-center gap-6">
          <button
            type="button"
            aria-label="Triarc Command Center - Go to Bug Matrix"
            className="flex items-center gap-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 rounded-xl p-1 group transition-all"
            onClick={() => setActiveTab('bugs')}
          >
            <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-900 flex items-center justify-center shadow-glow-cyan border border-cyan-300/40 group-hover:scale-105 transition-transform">
              <span className="font-black font-mono text-slate-950 text-lg tracking-tighter">▲</span>
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 shadow-glow-neon animate-pulse" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-black font-mono tracking-wider text-base text-white">
                  TRIARC
                </span>
                <span className="text-[9px] uppercase font-mono font-bold px-1.5 py-0.2 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 tracking-widest">
                  SOC-FLOW
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-400 tracking-tight hidden sm:inline">
                CYBERNETIC THREAT & BUG COMMAND
              </span>
            </div>
          </button>

          <nav aria-label="Main Navigation" className="flex items-center gap-1.5 ml-2">
            <button
              onClick={() => setActiveTab('bugs')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
                activeTab === 'bugs'
                  ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 shadow-glow-cyan'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>Incident Matrix</span>
            </button>

            <button
              onClick={() => setActiveTab('inbox')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all relative ${
                activeTab === 'inbox'
                  ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 shadow-glow-cyan'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
              }`}
            >
              <Inbox className="w-3.5 h-3.5 text-cyan-400" />
              <span>Clearance Inbox</span>
              {inboxCount > 0 && (
                <span className="px-1.5 py-0.2 text-[10px] font-mono font-bold rounded-full bg-amber-500 text-slate-950 animate-pulse shadow-glow-amber">
                  {inboxCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
                activeTab === 'analytics'
                  ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 shadow-glow-cyan'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              <span>Threat Flow Analytics</span>
            </button>

            {currentUser?.role === 'admin' && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
                  activeTab === 'admin'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-glow-purple'
                    : 'text-purple-400/80 hover:text-purple-300 hover:bg-purple-950/40 border border-transparent'
                }`}
              >
                <Settings className="w-3.5 h-3.5 text-purple-400" />
                <span>Governance</span>
              </button>
            )}
          </nav>
        </div>

        {/* Middle: Command Search Bar */}
        <div className="flex-1 max-w-md hidden md:block">
          <button
            onClick={openCommandPalette}
            className="w-full flex items-center justify-between px-3.5 py-1.5 text-xs text-slate-400 bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 hover:border-cyan-500/40 rounded-xl transition-all shadow-inner group"
          >
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-cyan-400 group-hover:text-cyan-300 transition-colors" />
              <span className="font-mono text-[11px]">Command search, radar query, CVEs...</span>
            </div>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono text-cyan-300 bg-slate-950 rounded-md border border-slate-800 shadow-sm">
              <Command className="w-2.5 h-2.5" /> K
            </kbd>
          </button>
        </div>

        {/* Right: Telemetry + Tools + Action HUD */}
        <div className="flex items-center gap-2.5">
          {/* Live Node / SSE Status */}
          <div
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900/90 border border-slate-800 text-[10px] font-mono"
            title="Real-time TLS 1.3 telemetry stream"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isConnected
                  ? 'bg-emerald-400 shadow-glow-neon animate-pulse'
                  : 'bg-red-500 shadow-glow-red'
              }`}
            />
            <span className={isConnected ? 'text-emerald-300' : 'text-red-400'}>
              {isConnected ? 'STREAM: SECURE' : 'STREAM: OFFLINE'}
            </span>
          </div>

          {/* GitHub Ingestion Button */}
          <button
            onClick={openImportModal}
            className="px-2.5 py-1.5 rounded-xl text-xs font-medium text-purple-300 hover:text-white bg-purple-950/40 hover:bg-purple-900/60 border border-purple-800/60 hover:border-purple-500/60 flex items-center gap-1.5 transition-all shadow-sm group"
            title="Ingest authentic GitHub repository issue/PR stream"
          >
            <Github className="w-3.5 h-3.5 text-purple-400 group-hover:rotate-12 transition-transform" />
            <span className="hidden sm:inline font-mono">Repo Ingest</span>
          </button>

          {/* Webhook Simulator Trigger */}
          <button
            onClick={openWebhookSimulator}
            className="px-2.5 py-1.5 rounded-xl text-xs font-medium text-cyan-300 hover:text-white bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-800/60 hover:border-cyan-500/60 flex items-center gap-1.5 transition-all shadow-sm"
            title="Simulate external CI/CD & git payload webhooks"
          >
            <GitPullRequest className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline font-mono">Simulate</span>
          </button>

          {/* Keyboard Shortcuts Trigger */}
          {openKeyboardShortcuts && (
            <button
              onClick={openKeyboardShortcuts}
              className="p-1.5 rounded-xl text-slate-400 hover:text-cyan-300 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 transition-all"
              title="Keyboard command shortcuts (?)"
            >
              <Keyboard className="w-4 h-4" />
            </button>
          )}

          {/* Alert Center / Notifications Bell */}
          <div className="relative">
            <button
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className="p-1.5 rounded-xl text-slate-400 hover:text-cyan-300 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 transition-all relative"
              title="Tactical Alerts & Watcher Updates"
              aria-label={`Tactical alerts ${unreadNotifCount > 0 ? `(${unreadNotifCount} unread)` : ''}`}
            >
              <Bell className="w-4 h-4" />
              {unreadNotifCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center shadow-glow-red animate-pulse">
                  {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                </span>
              )}
            </button>

            {isNotifOpen && (
              <div className="absolute right-0 mt-2 w-84 rounded-2xl bg-slate-950 border border-cyan-500/30 shadow-2xl p-2.5 z-50 animate-slide-up cyber-corners backdrop-blur-2xl">
                <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-slate-800/80 mb-1.5">
                  <div className="flex items-center gap-2">
                    <Bell className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="text-xs font-bold font-mono text-white">TACTICAL ALERTS</span>
                    {unreadNotifCount > 0 && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-red-950 text-red-300 border border-red-800 font-mono">
                        {unreadNotifCount} new
                      </span>
                    )}
                  </div>
                  {unreadNotifCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-[10px] text-cyan-400 hover:text-cyan-300 font-mono flex items-center gap-1 transition-colors"
                    >
                      <Check className="w-3 h-3" /> Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto space-y-1">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-500 font-mono">
                      No active threat alerts
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <button
                        key={n.id}
                        onClick={() => handleSelectNotification(n)}
                        className={`w-full text-left p-2.5 rounded-xl text-xs transition-all flex flex-col gap-1 ${
                          !n.read
                            ? 'bg-cyan-950/30 border border-cyan-500/40 text-slate-100'
                            : 'hover:bg-slate-900/60 text-slate-400 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono text-cyan-400 font-bold">
                            INCIDENT #{n.bug_id}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className={`text-xs ${!n.read ? 'text-slate-100 font-medium' : 'text-slate-300'}`}>
                          {n.message}
                        </p>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* New Incident / Bug Button */}
          <button
            onClick={openNewBugModal}
            className="cyber-btn-primary"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span className="font-mono">Report Incident</span>
          </button>

          {/* User Security Clearance Profile */}
          <div className="relative">
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-2 pl-2 pr-2.5 py-1 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 transition-all text-left group"
            >
              <div className="relative w-7 h-7 rounded-full bg-cyan-950/80 border border-cyan-500/50 flex items-center justify-center text-[11px] font-bold text-cyan-200 overflow-hidden shadow-sm">
                {currentUser?.avatar_url ? (
                  <img src={currentUser.avatar_url} alt={currentUser.name} className="w-full h-full object-cover" />
                ) : (
                  currentUser?.name.charAt(0) || 'U'
                )}
                <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-400 border border-slate-950" />
              </div>
              <div className="hidden lg:flex flex-col">
                <span className="text-xs font-semibold text-slate-200 leading-tight group-hover:text-cyan-300 transition-colors">
                  {currentUser?.name || 'Guest'}
                </span>
                <span className="text-[9px] font-mono text-slate-400 leading-none uppercase">
                  {currentUser?.role || 'developer'}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
            </button>

            {/* Tactical Dropdown Menu */}
            {isUserMenuOpen && (
              <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-slate-950 border border-cyan-500/30 shadow-2xl p-3 z-50 animate-slide-up space-y-3 cyber-corners backdrop-blur-2xl">
                {/* Active User Header */}
                <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">{currentUser?.name}</span>
                    <span className={`text-[9px] font-mono px-2 py-0.5 rounded border uppercase font-semibold ${clearance.color}`}>
                      {currentUser?.role}
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 truncate">
                    @{currentUser?.username} · {currentUser?.email}
                  </div>
                  <div className="pt-1 flex items-center gap-1.5 text-[10px] font-mono text-cyan-400">
                    <Lock className="w-3 h-3 text-cyan-400" />
                    <span>{clearance.label}</span>
                  </div>
                </div>

                {/* Persona Switcher */}
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-mono font-bold text-slate-400 px-1 tracking-wider">
                    Quick Switch Operator Clearance
                  </p>
                  <div className="max-h-52 overflow-y-auto space-y-1 pr-0.5">
                    {users.filter(u => !u.is_external).map((u) => {
                      const isSelected = u.id === currentUser?.id;
                      return (
                        <button
                          key={u.id}
                          onClick={() => {
                            switchUserById(u.id);
                            setIsUserMenuOpen(false);
                          }}
                          className={`w-full flex items-center justify-between p-2 rounded-xl text-xs transition-all ${
                            isSelected
                              ? 'bg-cyan-500/20 text-white border border-cyan-500/40 shadow-glow-cyan'
                              : 'text-slate-300 hover:bg-slate-900/90 border border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <img
                              src={u.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                              alt={u.name}
                              className="w-6 h-6 rounded-full border border-slate-700 object-cover"
                            />
                            <div className="text-left">
                              <span className="font-semibold text-xs text-white block">{u.name}</span>
                              <span className="text-[10px] text-slate-400 font-mono block">@{u.username}</span>
                            </div>
                          </div>
                          <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border capitalize ${getRoleBadge(u.role)}`}>
                            {u.role}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Authentication Dialog Button */}
                <div className="pt-2 border-t border-slate-800">
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      document.dispatchEvent(new CustomEvent('triarc:open-login-modal'));
                    }}
                    className="w-full flex items-center justify-center space-x-2 py-2 rounded-xl bg-slate-900 hover:bg-cyan-950/40 text-cyan-300 hover:text-cyan-200 border border-slate-800 hover:border-cyan-500/40 text-xs font-mono transition-all"
                  >
                    <Shield className="w-3.5 h-3.5" />
                    <span>Switch Credentials / Key Dialog</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

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
  Lock,
  ArrowRight
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
    } catch (err) { }
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
    } catch (err) { }
  };

  const getClearanceLevel = (role?: string) => {
    switch (role) {
      case 'admin':
        return { label: 'LEVEL 5 - SEC OPS LEAD', color: 'text-[#ea580c] border-[#ea580c] bg-[#ea580c]/10' };
      case 'security':
        return { label: 'LEVEL 4 - SECURITY CORE', color: 'text-red-400 border-red-500/40 bg-red-950/60' };
      case 'triager':
        return { label: 'LEVEL 3 - INCIDENT TRIAGE', color: 'text-amber-400 border-amber-500/40 bg-amber-950/60' };
      case 'developer':
        return { label: 'LEVEL 2 - CORE DEV', color: 'text-foreground border-foreground/30 bg-white/5' };
      case 'reporter':
      default:
        return { label: 'LEVEL 1 - FIELD AGENT', color: 'text-muted-foreground border-border bg-black' };
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-[#ea580c]/20 text-[#ea580c] border-[#ea580c]';
      case 'security':
        return 'bg-red-950/80 text-red-300 border-red-500/40';
      case 'triager':
        return 'bg-amber-950/80 text-amber-300 border-amber-500/40';
      case 'developer':
        return 'bg-white/10 text-foreground border-foreground/40';
      default:
        return 'bg-black text-muted-foreground border-border';
    }
  };

  const clearance = getClearanceLevel(currentUser?.role);

  return (
    <header className="sticky top-0 z-40 bg-[#080808]/90 backdrop-blur-md border-b-2 border-foreground/20 px-4 lg:px-8 py-2.5 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Left: Brand HUD + Navigation Tabs */}
        <div className="flex items-center gap-6">
          <button
            type="button"
            aria-label="SYS.INT Triarc - Go to Incident Matrix"
            className="flex items-center gap-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ea580c] p-1 group transition-all"
            onClick={() => setActiveTab('bugs')}
          >
            <div className="relative w-8 h-8 bg-foreground flex items-center justify-center border-2 border-foreground group-hover:bg-[#ea580c] transition-colors">
              <Cpu className="w-4 h-4 text-background" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#ea580c] animate-blink" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-bold font-mono tracking-[0.15em] text-sm text-foreground uppercase">
                  SYS.INT
                </span>
                <span className="text-[9px] uppercase font-mono font-bold px-1.5 py-0.5 bg-foreground text-background tracking-widest">
                  TRIARC // OS
                </span>
              </div>
              <span className="text-[9px] font-mono text-muted-foreground tracking-widest uppercase hidden sm:inline">
                HIGH-INTEGRITY GOVERNANCE
              </span>
            </div>
          </button>

          <nav aria-label="Main Navigation" className="flex items-center gap-1 ml-2">
            <button
              onClick={() => setActiveTab('bugs')}
              className={`px-3 py-1.5 text-xs font-mono uppercase tracking-wider flex items-center gap-2 transition-all border-2 ${activeTab === 'bugs'
                  ? 'bg-foreground text-background border-foreground font-bold'
                  : 'text-muted-foreground hover:text-foreground border-transparent hover:border-foreground/30'
                }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>TRIAGE // 01</span>
            </button>

            <button
              onClick={() => setActiveTab('inbox')}
              className={`px-3 py-1.5 text-xs font-mono uppercase tracking-wider flex items-center gap-2 transition-all border-2 relative ${activeTab === 'inbox'
                  ? 'bg-foreground text-background border-foreground font-bold'
                  : 'text-muted-foreground hover:text-foreground border-transparent hover:border-foreground/30'
                }`}
            >
              <Inbox className="w-3.5 h-3.5" />
              <span>REQUESTS // 02</span>
              {inboxCount > 0 && (
                <span className="px-1.5 py-0.2 text-[10px] font-mono font-bold bg-[#ea580c] text-foreground animate-blink">
                  {inboxCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-3 py-1.5 text-xs font-mono uppercase tracking-wider flex items-center gap-2 transition-all border-2 ${activeTab === 'analytics'
                  ? 'bg-foreground text-background border-foreground font-bold'
                  : 'text-muted-foreground hover:text-foreground border-transparent hover:border-foreground/30'
                }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>ANALYTICS // 03</span>
            </button>

            {currentUser?.role === 'admin' && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`px-3 py-1.5 text-xs font-mono uppercase tracking-wider flex items-center gap-2 transition-all border-2 ${activeTab === 'admin'
                    ? 'bg-[#ea580c] text-foreground border-[#ea580c] font-bold'
                    : 'text-[#ea580c]/80 hover:text-[#ea580c] border-transparent hover:border-[#ea580c]/30'
                  }`}
              >
                <Settings className="w-3.5 h-3.5" />
                <span>ADMIN // 04</span>
              </button>
            )}
          </nav>
        </div>

        {/* Middle: Command Search Bar */}
        <div className="flex-1 max-w-sm hidden md:block">
          <button
            onClick={openCommandPalette}
            className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-muted-foreground bg-[#0d0d0d] hover:bg-[#141414] border-2 border-foreground/20 hover:border-foreground/40 transition-all group"
          >
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
              <span className="font-mono text-[11px] uppercase tracking-wider">SEARCH // CMD_K</span>
            </div>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-mono text-background bg-foreground font-bold">
              <Command className="w-2.5 h-2.5" /> K
            </kbd>
          </button>
        </div>

        {/* Right: Telemetry + Tools + Action HUD */}
        <div className="flex items-center gap-2">
          {/* Live Node / SSE Status */}
          <div
            className="hidden lg:flex items-center gap-2 px-2.5 py-1.5 border-2 border-foreground/20 bg-[#0d0d0d] text-[10px] font-mono uppercase tracking-widest"
            title="Real-time TLS 1.3 telemetry stream"
          >
            <span
              className={`w-2 h-2 ${isConnected
                  ? 'bg-[#ea580c] animate-blink'
                  : 'bg-red-500'
                }`}
            />
            <span className={isConnected ? 'text-foreground' : 'text-red-400'}>
              {isConnected ? 'NODE: ONLINE' : 'NODE: OFFLINE'}
            </span>
          </div>

          {/* GitHub Ingestion Button */}
          <button
            onClick={openImportModal}
            className="px-2.5 py-1.5 border-2 border-foreground/20 hover:border-foreground text-xs font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground bg-[#0d0d0d] flex items-center gap-1.5 transition-all"
            title="Ingest GitHub repository issue stream"
          >
            <Github className="w-3.5 h-3.5" />
            <span className="hidden sm:inline font-mono">IMPORT</span>
          </button>

          {/* Webhook Simulator Trigger */}
          <button
            onClick={openWebhookSimulator}
            className="px-2.5 py-1.5 border-2 border-foreground/20 hover:border-foreground text-xs font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground bg-[#0d0d0d] flex items-center gap-1.5 transition-all"
            title="Simulate CI/CD & git webhooks"
          >
            <GitPullRequest className="w-3.5 h-3.5 text-[#ea580c]" />
            <span className="hidden sm:inline font-mono">SIMULATE</span>
          </button>

          {/* Keyboard Shortcuts Trigger */}
          {openKeyboardShortcuts && (
            <button
              onClick={openKeyboardShortcuts}
              className="p-1.5 border-2 border-foreground/20 hover:border-foreground text-muted-foreground hover:text-foreground bg-[#0d0d0d] transition-all"
              title="Keyboard command shortcuts (?)"
            >
              <Keyboard className="w-4 h-4" />
            </button>
          )}

          {/* Alert Center / Notifications Bell */}
          <div className="relative">
            <button
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className="p-1.5 border-2 border-foreground/20 hover:border-foreground text-muted-foreground hover:text-foreground bg-[#0d0d0d] transition-all relative"
              title="Tactical Alerts"
              aria-label={`Tactical alerts ${unreadNotifCount > 0 ? `(${unreadNotifCount} unread)` : ''}`}
            >
              <Bell className="w-4 h-4" />
              {unreadNotifCount > 0 && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-[#ea580c] text-background text-[9px] font-mono font-bold flex items-center justify-center">
                  {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                </span>
              )}
            </button>

            {isNotifOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-[#0d0d0d] border-2 border-foreground shadow-brutalist p-3 z-50 animate-slide-up">
                <div className="flex items-center justify-between pb-2 border-b-2 border-foreground/20 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-[#ea580c] animate-blink" />
                    <span className="text-xs font-bold font-mono uppercase text-foreground">SYSTEM ALERTS</span>
                  </div>
                  {unreadNotifCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-[10px] text-muted-foreground hover:text-foreground font-mono uppercase"
                    >
                      CLEAR ALL
                    </button>
                  )}
                </div>

                <div className="max-h-72 overflow-y-auto space-y-1">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-xs text-muted-foreground font-mono uppercase">
                      NO ACTIVE ALERTS
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <button
                        key={n.id}
                        onClick={() => handleSelectNotification(n)}
                        className={`w-full text-left p-2 border text-xs transition-all flex flex-col gap-1 ${!n.read
                            ? 'bg-[#141414] border-foreground text-foreground'
                            : 'bg-transparent border-border text-muted-foreground hover:border-foreground/40'
                          }`}
                      >
                        <div className="flex items-center justify-between font-mono text-[10px]">
                          <span className="text-[#ea580c] font-bold">
                            BUG #{n.bug_id}
                          </span>
                          <span className="text-muted-foreground">
                            {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs font-mono">
                          {n.message}
                        </p>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* New Incident Split Button */}
          <button
            onClick={openNewBugModal}
            className="brutalist-btn"
          >
            <span className="btn-icon-block">
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
            </span>
            <span className="btn-text-block">NEW REPORT</span>
          </button>

          {/* User Security Clearance Profile */}
          <div className="relative">
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-2 px-2.5 py-1.5 border-2 border-foreground/20 hover:border-foreground bg-[#0d0d0d] transition-all text-left group"
            >
              <div className="w-5 h-5 bg-foreground text-background font-mono font-bold text-[10px] flex items-center justify-center">
                {currentUser?.name.charAt(0) || 'U'}
              </div>
              <div className="hidden lg:flex flex-col">
                <span className="text-xs font-bold font-mono text-foreground uppercase leading-none">
                  @{currentUser?.username || 'user'}
                </span>
                <span className="text-[9px] font-mono text-muted-foreground leading-none uppercase mt-0.5">
                  {currentUser?.role || 'dev'}
                </span>
              </div>
              <ChevronDown className="w-3 h-3 text-muted-foreground ml-0.5" />
            </button>

            {/* Tactical Dropdown Menu */}
            {isUserMenuOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-[#0d0d0d] border-2 border-foreground shadow-brutalist p-3 z-50 animate-slide-up space-y-3">
                {/* Active User Header */}
                <div className="p-2.5 border-2 border-foreground/20 bg-[#121212] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold font-mono uppercase text-foreground">{currentUser?.name}</span>
                    <span className={`text-[9px] font-mono px-1.5 py-0.5 border uppercase font-bold ${clearance.color}`}>
                      {currentUser?.role}
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-muted-foreground truncate">
                    @{currentUser?.username} · {currentUser?.email}
                  </div>
                </div>

                {/* Persona Switcher */}
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-mono font-bold text-muted-foreground tracking-wider">
                    OPERATOR CLEARANCE SWITCH
                  </p>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {users.filter(u => !u.is_external).map((u) => {
                      const isSelected = u.id === currentUser?.id;
                      return (
                        <button
                          key={u.id}
                          onClick={() => {
                            switchUserById(u.id);
                            setIsUserMenuOpen(false);
                          }}
                          className={`w-full flex items-center justify-between p-2 text-xs font-mono transition-all border ${isSelected
                              ? 'bg-foreground text-background border-foreground font-bold'
                              : 'text-muted-foreground hover:text-foreground hover:bg-[#141414] border-border'
                            }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-[#ea580c]" />
                            <span className="uppercase">@{u.username}</span>
                          </div>
                          <span className="text-[9px] uppercase">
                            [{u.role}]
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Authentication Dialog Button */}
                <div className="pt-2 border-t-2 border-foreground/20">
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      document.dispatchEvent(new CustomEvent('triarc:open-login-modal'));
                    }}
                    className="w-full flex items-center justify-center gap-2 py-1.5 bg-[#141414] hover:bg-foreground hover:text-background border-2 border-foreground/30 text-xs font-mono uppercase tracking-wider transition-all"
                  >
                    <Shield className="w-3.5 h-3.5" />
                    <span>AUTH DIALOG</span>
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

import React, { useEffect, useState } from 'react';
import {
  Layers,
  Inbox,
  Plus,
  GitPullRequest,
  Search,
  Keyboard,
  Bell,
  Github,
  LogOut,
  Settings,
  Cpu,
  ChevronDown,
  Bot,
} from 'lucide-react';
import { useLocation, useNavigate, Link } from 'react-router-dom';

import { useAuth } from '../context/AuthContext.tsx';
import { useSSE } from '../context/SSEContext.tsx';
import { useCyberPet } from './CyberPet/CyberPetContext.tsx';

import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '../services/api.ts';

interface NavbarProps {
  activeTab?: 'bugs' | 'inbox' | 'analytics' | 'admin';
  setActiveTab?: (tab: 'bugs' | 'inbox' | 'analytics' | 'admin') => void;
  openNewBugModal: () => void;
  openWebhookSimulator: () => void;
  openImportModal: () => void;
  openCommandPalette: () => void;
  openKeyboardShortcuts?: () => void;
  onSelectBug?: (bugId: number) => void;
  inboxCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  openNewBugModal,
  openWebhookSimulator,
  openImportModal,
  openCommandPalette,
  openKeyboardShortcuts,
  inboxCount = 0,
}) => {
  const location = useLocation();
  const navigate = useNavigate();

  const {
    currentUser,
    users,
    switchUserById,
    logout,
  } = useAuth();

  const {
    isConnected,
    lastEvent,
  } = useSSE();

  const {
    isAssistantOpen,
    setIsAssistantOpen,
    skin,
  } = useCyberPet();

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  /* =====================================================
     ROUTE STATE
  ===================================================== */

  const isProjectsActive =
    location.pathname === '/' ||
    location.pathname.startsWith('/projects');

  const isInboxActive =
    location.pathname.startsWith('/inbox');

  const isAdminActive =
    location.pathname.startsWith('/admin');

  /* =====================================================
     NOTIFICATIONS
  ===================================================== */

  const loadNotifications = async () => {
    try {
      const data = await fetchNotifications(
        false,
        currentUser?.id
      );

      setNotifications(data.notifications || []);
      setUnreadNotifCount(data.unread_count || 0);
    } catch {
      // Ignore notification errors
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadNotifications();
    }
  }, [currentUser]);

  useEffect(() => {
    if (
      lastEvent?.type === 'notification:created' ||
      lastEvent?.type === 'bug:updated'
    ) {
      loadNotifications();
    }
  }, [lastEvent]);

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead(currentUser?.id);

      setNotifications((prev) =>
        prev.map((notification) => ({
          ...notification,
          read: 1,
        }))
      );

      setUnreadNotifCount(0);
    } catch {
      // Ignore
    }
  };

  const handleSelectNotification = async (notif: any) => {
    try {
      await markNotificationRead(
        notif.id,
        currentUser?.id
      );

      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === notif.id
            ? { ...notification, read: 1 }
            : notification
        )
      );

      setUnreadNotifCount((prev) =>
        Math.max(0, prev - 1)
      );

      if (notif.bug_id) {
        navigate(
          `/projects/CORE/issues/${notif.bug_id}`
        );
      }

      setIsNotifOpen(false);
    } catch {
      // Ignore
    }
  };

  /* =====================================================
     CLEARANCE
  ===================================================== */

  const getClearanceLevel = (role?: string) => {
    switch (role) {
      case 'admin':
        return {
          label: 'LEVEL 5 - SEC OPS LEAD',
          color:
            'text-[#B497CF] border-[#B497CF]/50 bg-[#B497CF]/10',
        };

      case 'security':
        return {
          label: 'LEVEL 4 - SECURITY CORE',
          color:
            'text-red-400 border-red-500/40 bg-red-950/60',
        };

      case 'triager':
        return {
          label: 'LEVEL 3 - INCIDENT TRIAGE',
          color:
            'text-amber-400 border-amber-500/40 bg-amber-950/60',
        };

      case 'developer':
        return {
          label: 'LEVEL 2 - CORE DEV',
          color:
            'text-white border-white/20 bg-white/5',
        };

      case 'reporter':
      default:
        return {
          label: 'LEVEL 1 - FIELD AGENT',
          color:
            'text-white/45 border-white/10 bg-black/30',
        };
    }
  };

  const clearance = getClearanceLevel(
    currentUser?.role
  );

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <header
      className="
        sticky top-0 z-40
        w-full max-w-full
        overflow-hidden
        bg-[#080512]/95
        backdrop-blur-md
        border-b border-white/10
        px-3 sm:px-4 lg:px-6 xl:px-8
        py-3
        transition-all
        font-mono
      "
    >
      <div
        className="
          w-full
          max-w-[1600px]
          mx-auto
          flex
          items-center
          justify-between
          gap-2 lg:gap-3 xl:gap-5
          min-w-0
        "
      >

        {/* =================================================
            LEFT SIDE
        ================================================= */}

        <div
          className="
            flex items-center
            gap-2 lg:gap-4 xl:gap-6
            min-w-0
            shrink-0
          "
        >

          {/* BRAND */}

          <Link
            to="/"
            aria-label="Triarc - Home / Landing"
            className="
              flex items-center
              gap-2 lg:gap-3
              text-left
              p-1
              group
              transition-all
              focus:outline-none
              focus-visible:ring-2
              focus-visible:ring-[#B497CF]
              shrink-0
            "
          >

            <div className="relative w-8 h-8 bg-foreground flex items-center justify-center border border-foreground group-hover:bg-[#ea580c] transition-colors rounded-sm">
              <Cpu className="w-4 h-4 text-background" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#ea580c] animate-blink" />
            </div>

            {/* Brand */}

            <div className="flex flex-col min-w-0">

              <div className="flex items-center gap-1.5">

                <span
                  className="
                    font-bold
                    tracking-[0.12em]
                    text-sm
                    text-white
                    uppercase
                  "
                >
                  TRIARC
                </span>

                <span
                  className="
                    text-[8px]
                    uppercase
                    font-bold
                    px-1.5
                    py-0.5
                    bg-white/10
                    text-white/70
                    border border-white/15
                    tracking-wider
                  "
                >
                  FLOW
                </span>

              </div>

              <span
                className="
                  text-[9px]
                  text-white/30
                  tracking-wider
                  uppercase
                  hidden xl:inline
                "
              >
                INCIDENT LIFECYCLE
              </span>

            </div>
          </Link>


          {/* =================================================
              MAIN NAVIGATION
          ================================================= */}

          <nav
            aria-label="Main Navigation"
            className="
              hidden sm:flex
              items-center
              gap-1
              min-w-0
            "
          >

            {/* PROJECTS */}

            <Link
              to="/projects"
              className={`
                px-2 lg:px-3
                py-1.5
                text-[10px] lg:text-xs
                uppercase
                tracking-wider
                flex items-center
                gap-1.5 lg:gap-2
                transition-all
                border
                rounded-sm
                whitespace-nowrap
                ${
                  isProjectsActive
                    ? 'bg-[#5227FF] text-white border-[#5227FF] font-bold shadow-[0_0_18px_rgba(82,39,255,0.18)]'
                    : 'text-white/45 border-transparent hover:text-white hover:border-white/10 hover:bg-white/[0.03]'
                }
              `}
            >
              <Layers className="w-3.5 h-3.5 shrink-0" />

              <span>
                PROJECTS
              </span>
            </Link>


            {/* INBOX */}

            <Link
              to="/inbox"
              className={`
                px-2 lg:px-3
                py-1.5
                text-[10px] lg:text-xs
                uppercase
                tracking-wider
                flex items-center
                gap-1.5 lg:gap-2
                transition-all
                border
                rounded-sm
                relative
                whitespace-nowrap
                ${
                  isInboxActive
                    ? 'bg-[#5227FF] text-white border-[#5227FF] font-bold shadow-[0_0_18px_rgba(82,39,255,0.18)]'
                    : 'text-white/45 border-transparent hover:text-white hover:border-white/10 hover:bg-white/[0.03]'
                }
              `}
            >
              <Inbox className="w-3.5 h-3.5 shrink-0" />

              <span>
                INBOX
              </span>

              {inboxCount > 0 && (
                <span
                  className="
                    px-1.5
                    text-[9px]
                    font-bold
                    bg-[#B497CF]
                    text-[#10091D]
                  "
                >
                  {inboxCount}
                </span>
              )}
            </Link>


            {/* ADMIN */}

            {currentUser?.role === 'admin' && (
              <Link
                to="/admin"
                className={`
                  px-2 lg:px-3
                  py-1.5
                  text-[10px] lg:text-xs
                  uppercase
                  tracking-wider
                  flex items-center
                  gap-1.5 lg:gap-2
                  transition-all
                  border
                  rounded-sm
                  whitespace-nowrap
                  ${
                    isAdminActive
                      ? 'bg-[#B497CF] text-[#10091D] border-[#B497CF] font-bold'
                      : 'text-[#B497CF]/70 border-transparent hover:text-[#B497CF] hover:border-[#B497CF]/30 hover:bg-[#B497CF]/5'
                  }
                `}
              >
                <Settings className="w-3.5 h-3.5 shrink-0" />

                <span>
                  ADMIN
                </span>
              </Link>
            )}

          </nav>
        </div>

        {/* =================================================
            RIGHT SIDE
        ================================================= */}

        <div
          className="
            flex items-center
            gap-1.5 lg:gap-2 xl:gap-2.5
            shrink-0
          "
        >

          {/* =================================================
              LIVE STATUS
          ================================================= */}

          <div
            className="
              hidden xl:flex
              items-center
              gap-2
              px-2
              py-1.5
              border border-white/10
              bg-[#0d0818]
              text-[10px]
              font-mono
              uppercase
              tracking-wider
              shrink-0
            "
            title="Real-time telemetry connection"
          >
            <span
              className={`
                w-1.5 h-1.5
                ${
                  isConnected
                    ? 'bg-[#B497CF] shadow-[0_0_8px_rgba(180,151,207,0.8)] animate-blink'
                    : 'bg-red-500'
                }
              `}
            />

            <span
              className={
                isConnected
                  ? 'text-white/70'
                  : 'text-red-400'
              }
            >
              {isConnected
                ? 'ONLINE'
                : 'OFFLINE'}
            </span>
          </div>


          {/* =================================================
              IMPORT
          ================================================= */}

          <button
            onClick={openImportModal}
            className="
              px-2
              py-1.5
              border border-white/10
              hover:border-[#B497CF]/50
              text-xs
              font-mono
              uppercase
              tracking-wider
              text-white/45
              hover:text-white
              bg-[#0d0818]
              flex items-center
              gap-1.5
              transition-all
              shrink-0
            "
            title="Ingest GitHub repository issues"
          >
            <Github className="w-3.5 h-3.5 shrink-0" />

            <span className="hidden xl:inline">
              IMPORT
            </span>
          </button>


          {/* =================================================
              WEBHOOK
          ================================================= */}

          <button
            onClick={openWebhookSimulator}
            className="
              px-2
              py-1.5
              border border-white/10
              hover:border-[#B497CF]/50
              text-xs
              font-mono
              uppercase
              tracking-wider
              text-white/45
              hover:text-white
              bg-[#0d0818]
              flex items-center
              gap-1.5
              transition-all
              shrink-0
            "
            title="Simulate git & CI/CD webhooks"
          >
            <GitPullRequest
              className="
                w-3.5 h-3.5
                text-[#B497CF]
                shrink-0
              "
            />

            <span className="hidden xl:inline">
              WEBHOOK
            </span>
          </button>


          {/* =================================================
              AI ASSISTANT
          ================================================= */}

          <button
            onClick={() =>
              setIsAssistantOpen(
                !isAssistantOpen
              )
            }
            className={`
              px-2
              py-1.5
              border
              text-xs
              font-mono
              uppercase
              tracking-wider
              bg-[#0d0818]
              flex items-center
              gap-1.5
              transition-all
              shrink-0
              ${
                skin === 'lizard'
                  ? `
                    border-[#22c55e]
                    text-[#22c55e]
                    hover:bg-[#22c55e]
                    hover:text-black
                  `
                  : `
                    border-[#B497CF]
                    text-[#B497CF]
                    hover:bg-[#B497CF]
                    hover:text-[#10091D]
                  `
              }
            `}
            title={
              skin === 'lizard'
                ? 'Launch Tom the Lizard Copilot'
                : 'Launch Byte AI Sentinel Copilot'
            }
          >

            {skin === 'lizard' ? (
              <span className="text-sm">
                🦎
              </span>
            ) : (
              <Bot
                className="
                  w-3.5 h-3.5
                  animate-pulse
                "
              />
            )}

            <span
              className="
                hidden xl:inline
                font-mono
                font-bold
              "
            >
              {skin === 'lizard'
                ? 'TOM AI'
                : 'BYTE AI'}
            </span>

          </button>


          {/* =================================================
              KEYBOARD SHORTCUTS
          ================================================= */}

          {openKeyboardShortcuts && (
            <button
              onClick={
                openKeyboardShortcuts
              }
              className="
                p-1.5
                border border-white/10
                hover:border-[#B497CF]/50
                text-white/45
                hover:text-white
                bg-[#0d0818]
                transition-all
                shrink-0
              "
              title="Keyboard shortcuts (?)"
            >
              <Keyboard className="w-4 h-4" />
            </button>
          )}


          {/* =================================================
              NOTIFICATIONS
          ================================================= */}

          <div className="relative shrink-0">

            <button
              onClick={() =>
                setIsNotifOpen(
                  !isNotifOpen
                )
              }
              className="
                p-1.5
                border border-white/10
                hover:border-[#B497CF]/50
                text-white/45
                hover:text-white
                bg-[#0d0818]
                transition-all
                relative
              "
              title="Notifications & Alerts"
              aria-label={`
                Alerts
                ${
                  unreadNotifCount > 0
                    ? `(${unreadNotifCount} unread)`
                    : ''
                }
              `}
            >
              <Bell className="w-4 h-4" />

              {unreadNotifCount > 0 && (
                <span
                  className="
                    absolute
                    -top-1
                    -right-1
                    w-3.5 h-3.5
                    bg-[#5227FF]
                    text-white
                    text-[9px]
                    font-mono
                    font-bold
                    flex items-center
                    justify-center
                    shadow-[0_0_8px_rgba(82,39,255,0.6)]
                  "
                >
                  {unreadNotifCount > 9
                    ? '9+'
                    : unreadNotifCount}
                </span>
              )}
            </button>


            {/* Notification dropdown */}

            {isNotifOpen && (
              <div
                className="
                  absolute
                  right-0
                  mt-2
                  w-[min(20rem,calc(100vw-1rem))]
                  bg-[#0d0818]
                  border border-white/15
                  shadow-[0_20px_60px_rgba(0,0,0,0.5)]
                  p-3
                  z-50
                  animate-slide-up
                "
              >

                <div
                  className="
                    flex items-center
                    justify-between
                    pb-2
                    border-b
                    border-white/10
                    mb-2
                  "
                >

                  <div className="flex items-center gap-2">

                    <span
                      className="
                        w-1.5 h-1.5
                        bg-[#B497CF]
                        animate-blink
                      "
                    />

                    <span
                      className="
                        text-xs
                        font-bold
                        font-mono
                        uppercase
                        text-white
                      "
                    >
                      SYSTEM ALERTS
                    </span>

                  </div>

                  {unreadNotifCount > 0 && (
                    <button
                      onClick={
                        handleMarkAllRead
                      }
                      className="
                        text-[10px]
                        text-white/40
                        hover:text-[#B497CF]
                        font-mono
                        uppercase
                      "
                    >
                      CLEAR ALL
                    </button>
                  )}

                </div>


                <div
                  className="
                    max-h-72
                    overflow-y-auto
                    space-y-1
                  "
                >

                  {notifications.length === 0 ? (

                    <div
                      className="
                        p-4
                        text-center
                        text-xs
                        text-white/35
                        font-mono
                        uppercase
                      "
                    >
                      NO ACTIVE ALERTS
                    </div>

                  ) : (

                    notifications.map(
                      (n) => (
                        <button
                          key={n.id}
                          onClick={() =>
                            handleSelectNotification(
                              n
                            )
                          }
                          className={`
                            w-full
                            text-left
                            p-2
                            border
                            text-xs
                            transition-all
                            flex flex-col
                            gap-1
                            ${
                              !n.read
                                ? 'bg-white/[0.04] border-[#B497CF]/40 text-white'
                                : 'bg-transparent border-white/10 text-white/45 hover:border-[#B497CF]/30'
                            }
                          `}
                        >

                          <div
                            className="
                              flex items-center
                              justify-between
                              font-mono
                              text-[10px]
                            "
                          >

                            <span
                              className="
                                text-[#B497CF]
                                font-bold
                              "
                            >
                              BUG #{n.bug_id}
                            </span>

                            <span className="text-white/30">
                              {new Date(
                                n.created_at
                              ).toLocaleTimeString(
                                [],
                                {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                }
                              )}
                            </span>

                          </div>

                          <p className="text-xs font-mono">
                            {n.message}
                          </p>

                        </button>
                      )
                    )

                  )}

                </div>
              </div>
            )}

          </div>


          {/* =================================================
              NEW REPORT
          ================================================= */}

          <button
            onClick={openNewBugModal}
            className="
              brutalist-btn
              flex items-center
              shrink-0
            "
            title="Create new incident"
          >
            <span className="btn-icon-block">
              <Plus
                className="
                  w-3.5 h-3.5
                  stroke-[3]
                "
              />
            </span>

            <span className="btn-text-block hidden xl:inline">
              NEW REPORT
            </span>
          </button>


          {/* =================================================
              USER PROFILE
          ================================================= */}

          <div className="relative shrink-0">

            <button
              onClick={() =>
                setIsUserMenuOpen(
                  !isUserMenuOpen
                )
              }
              className="
                flex items-center
                gap-1.5 lg:gap-2
                px-1.5 lg:px-2.5
                py-1.5
                border border-white/15
                hover:border-[#B497CF]/50
                bg-[#0d0818]
                transition-all
                text-left
                group
              "
            >

              <div
                className="
                  w-5 h-5
                  bg-[#B497CF]
                  text-[#10091D]
                  font-mono
                  font-bold
                  text-[10px]
                  flex items-center
                  justify-center
                  shrink-0
                "
              >
                {currentUser?.name?.charAt(0) || 'U'}
              </div>


              <div
                className="
                  hidden xl:flex
                  flex-col
                  max-w-[100px]
                  min-w-0
                "
              >

                <span
                  className="
                    text-[10px]
                    font-bold
                    font-mono
                    text-white
                    uppercase
                    leading-none
                    truncate
                  "
                >
                  @{currentUser?.username || 'user'}
                </span>

                <span
                  className="
                    text-[9px]
                    font-mono
                    text-white/35
                    leading-none
                    uppercase
                    mt-0.5
                  "
                >
                  {currentUser?.role || 'dev'}
                </span>

              </div>

              <ChevronDown
                className="
                  w-3 h-3
                  text-white/35
                  ml-0.5
                  shrink-0
                "
              />

            </button>


            {/* =================================================
                USER DROPDOWN
            ================================================= */}

            {isUserMenuOpen && (
              <div
                className="
                  absolute
                  right-0
                  mt-2
                  w-[min(18rem,calc(100vw-1rem))]
                  bg-[#0d0818]
                  border border-white/15
                  shadow-[0_20px_60px_rgba(0,0,0,0.5)]
                  p-3
                  z-50
                  animate-slide-up
                  space-y-3
                "
              >

                {/* Active user */}

                <div
                  className="
                    p-2.5
                    border border-white/10
                    bg-white/[0.025]
                    space-y-1
                  "
                >

                  <div
                    className="
                      flex items-center
                      justify-between
                      gap-2
                    "
                  >

                    <span
                      className="
                        text-xs
                        font-bold
                        font-mono
                        uppercase
                        text-white
                        truncate
                      "
                    >
                      {currentUser?.name}
                    </span>

                    <span
                      className={`
                        text-[9px]
                        font-mono
                        px-1.5
                        py-0.5
                        border
                        uppercase
                        font-bold
                        shrink-0
                        ${clearance.color}
                      `}
                    >
                      {currentUser?.role}
                    </span>

                  </div>

                  <div
                    className="
                      text-[10px]
                      font-mono
                      text-white/35
                      truncate
                    "
                  >
                    @{currentUser?.username} ·{' '}
                    {currentUser?.email}
                  </div>

                </div>


                {/* Persona switcher */}

                <div className="space-y-1">

                  <p
                    className="
                      text-[10px]
                      uppercase
                      font-mono
                      font-bold
                      text-white/35
                      tracking-wider
                    "
                  >
                    OPERATOR CLEARANCE SWITCH
                  </p>

                  <div
                    className="
                      max-h-48
                      overflow-y-auto
                      space-y-1
                    "
                  >

                    {users
                      .filter(
                        (u) => !u.is_external
                      )
                      .map((u) => {

                        const isSelected =
                          u.id ===
                          currentUser?.id;

                        return (
                          <button
                            key={u.id}
                            onClick={() => {
                              switchUserById(
                                u.id
                              );
                              setIsUserMenuOpen(
                                false
                              );
                            }}
                            className={`
                              w-full
                              flex items-center
                              justify-between
                              p-2
                              text-xs
                              font-mono
                              transition-all
                              border
                              ${
                                isSelected
                                  ? 'bg-[#5227FF] text-white border-[#5227FF] font-bold'
                                  : 'text-white/45 hover:text-white hover:bg-white/[0.03] border-white/10 hover:border-[#B497CF]/30'
                              }
                            `}
                          >

                            <div
                              className="
                                flex items-center
                                gap-2
                                min-w-0
                              "
                            >

                              <span
                                className="
                                  w-1.5 h-1.5
                                  bg-[#B497CF]
                                  shrink-0
                                "
                              />

                              <span className="uppercase truncate">
                                @{u.username}
                              </span>

                            </div>

                            <span
                              className="
                                text-[9px]
                                uppercase
                                ml-2
                                shrink-0
                              "
                            >
                              [{u.role}]
                            </span>

                          </button>
                        );
                      })}

                  </div>

                </div>


                {/* Sign out */}

                <div
                  className="
                    pt-2
                    border-t
                    border-white/10
                    flex flex-col
                    gap-1.5
                  "
                >

                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      logout();
                      navigate('/login');
                    }}
                    className="
                      w-full
                      flex items-center
                      justify-center
                      gap-2
                      py-1.5
                      bg-white/[0.025]
                      hover:bg-red-950/50
                      hover:text-red-300
                      border border-white/10
                      text-white/50
                      hover:border-red-500/30
                      text-xs
                      uppercase
                      tracking-wider
                      transition-all
                    "
                  >
                    <LogOut className="w-3.5 h-3.5" />

                    <span>
                      SIGN OUT
                    </span>
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
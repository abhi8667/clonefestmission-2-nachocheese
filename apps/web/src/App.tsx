import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { Navbar } from './components/Navbar.tsx';
import { AppRoutes } from './routes/AppRoutes.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { NewBugModal } from './components/NewBug/NewBugModal.tsx';
import { GitHubImportModal } from './components/Import/GitHubImportModal.tsx';
import { LoginModal } from './components/Auth/LoginModal.tsx';
import { WebhookSimulatorModal } from './components/WebhookSimulator/WebhookSimulatorModal.tsx';
import { CommandPalette } from './components/CommandPalette.tsx';
import { KeyboardShortcutsModal } from './components/KeyboardShortcuts/KeyboardShortcutsModal.tsx';

import { SecurityTelemetryFeed } from './components/Cyber/SecurityTelemetryFeed.tsx';
import { TomLizardPet } from './components/CyberPet/TomLizardPet.tsx';
import { CyberAssistantDrawer } from './components/CyberPet/CyberAssistantDrawer.tsx';

import { useAuth } from './context/AuthContext.tsx';
import { useSSE } from './context/SSEContext.tsx';

import { fetchInbox, fetchBugs } from './services/api.ts';
import { Bug } from '@triarc/shared-types';

import LiquidEther from './components/LiquidEther';


export const App: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const { currentUser, isLoginModalOpen, setIsLoginModalOpen } = useAuth();
  const { lastEvent } = useSSE();

  // --------------------------------------------------
  // Modals state
  // --------------------------------------------------

  const [isNewBugOpen, setIsNewBugOpen] = useState(false);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isCmdOpen, setIsCmdOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  const [inboxCount, setInboxCount] = useState(0);
  const [recentBugs, setRecentBugs] = useState<Bug[]>([]);


  // --------------------------------------------------
  // Data loading
  // --------------------------------------------------

  const loadInboxCount = async () => {
    try {
      const res = await fetchInbox(currentUser?.id);
      setInboxCount(res.incoming?.length || 0);
    } catch {
      // Ignore
    }
  };


  const loadRecentBugs = async () => {
    try {
      const res = await fetchBugs({ userId: currentUser?.id });
      setRecentBugs(res.bugs || []);
    } catch {
      // Ignore
    }
  };


  useEffect(() => {
    if (currentUser) {
      loadInboxCount();
      loadRecentBugs();
    }
  }, [currentUser]);


  useEffect(() => {
    if (lastEvent) {
      loadInboxCount();
      loadRecentBugs();
    }
  }, [lastEvent]);


  // --------------------------------------------------
  // Global keyboard shortcuts
  // --------------------------------------------------

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;

      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;


      // Ctrl + K / Cmd + K
      if (
        (e.ctrlKey || e.metaKey) &&
        e.key.toLowerCase() === 'k'
      ) {
        e.preventDefault();
        setIsCmdOpen((prev) => !prev);
      }


      // ?
      if (
        !isInput &&
        e.key === '?' &&
        !e.ctrlKey &&
        !e.metaKey
      ) {
        e.preventDefault();
        setIsShortcutsOpen(true);
      }
    };


    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

<<<<<<< HEAD
  const isLandingPage = location.pathname === '/' || location.pathname === '/landing';
  const isLoginPage = location.pathname === '/login';
  const isPublicPage = isLandingPage || isLoginPage;
=======

  // --------------------------------------------------
  // Route state
  // --------------------------------------------------

const isLandingPage =
  location.pathname === '/' || location.pathname === '/landing';

const isLoginPage = location.pathname === '/login';

const isPublicPage = isLandingPage || isLoginPage;
>>>>>>> 4a521e3 (UI Changes)



  return (
    <div
      className="
        min-h-screen
        flex
        flex-col
        relative
        overflow-x-hidden
        text-white
        font-mono
        selection:bg-[#FF9FFC]
        selection:text-[#160B2E]
      "
      style={{
        background:
  'linear-gradient(135deg, #080512 0%, #10091D 50%, #080512 100%)',
      }}
    >

      {/* ==================================================
          GLOBAL LIQUID ETHER BACKGROUND
          Stays active on landing + every app page
      ================================================== */}

      <div
        className="
          fixed
          inset-0
          z-0
          pointer-events-none
          overflow-hidden
        "
      >
        <LiquidEther
          colors={[
            '#5227FF',
            '#FF9FFC',
            '#B497CF',
          ]}
          mouseForce={20}
          cursorSize={100}
          isViscous
          viscous={30}
          iterationsViscous={32}
          iterationsPoisson={32}
          resolution={0.5}
          isBounce={false}
          autoDemo
          autoSpeed={0.5}
          autoIntensity={2.2}
          takeoverDuration={0.25}
          autoResumeDelay={3000}
          autoRampDuration={0.6}
        />

        {/* Dark overlay for readability */}
        <div
          className="
            absolute
            inset-0
            bg-[#080512]/55
          "
        />

        {/* Subtle purple atmospheric glow */}
        <div
          className="
            absolute
            inset-0
            bg-[radial-gradient(circle_at_50%_20%,rgba(82,39,255,0.12),transparent_45%)]
          "
        />
      </div>


      {/* ==================================================
          APPLICATION CONTENT
      ================================================== */}

      <div className="relative z-10 min-h-screen flex flex-col">

        {/* Top Navbar */}
        {!isPublicPage && (
          <Navbar
            openNewBugModal={() => setIsNewBugOpen(true)}
            openWebhookSimulator={() => setIsSimulatorOpen(true)}
            openImportModal={() => setIsImportModalOpen(true)}
            openCommandPalette={() => setIsCmdOpen(true)}
            openKeyboardShortcuts={() => setIsShortcutsOpen(true)}
            inboxCount={inboxCount}
          />
        )}


        {/* ==================================================
            MAIN VIEWPORT
        ================================================== */}

        <div
          className={
            isPublicPage
              ? 'flex-1'
              : 'flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6'
          }
        >

          <ErrorBoundary>
            <AppRoutes />
          </ErrorBoundary>

        </div>


        {/* ==================================================
    SECURITY TELEMETRY
================================================== */}

{!isPublicPage && (
  <SecurityTelemetryFeed />
)}


{/* ==================================================
    GLOBAL MODALS
================================================== */}

<NewBugModal 
  isOpen={isNewBugOpen} 
  onClose={() => setIsNewBugOpen(false)} 
  onBugCreated={(newBugId) => { 
    loadRecentBugs(); 
    navigate(`/projects/CORE/issues/${newBugId}`); 
  }} 
  onSelectBug={(id) => 
    navigate(`/projects/CORE/issues/${id}`) 
  } 
/>

{/* ...other modals... */}


{/* ==================================================
    CYBER PET + AI ASSISTANT
    Only visible when logged in
================================================== */}

{currentUser && !isPublicPage && (
  <>
    <TomLizardPet />
    <CyberAssistantDrawer />
  </>
)}


{/* ==================================================
    LOGIN
================================================== */}

<LoginModal />
      </div>
    </div>
  );
};
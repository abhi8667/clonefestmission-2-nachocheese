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
import { CyberBackground } from './components/Cyber/CyberBackground.tsx';
import { SecurityTelemetryFeed } from './components/Cyber/SecurityTelemetryFeed.tsx';
import { CyberPetAvatar } from './components/CyberPet/CyberPetAvatar.tsx';
import { TomLizardPet } from './components/CyberPet/TomLizardPet.tsx';
import { CyberAssistantDrawer } from './components/CyberPet/CyberAssistantDrawer.tsx';
import { useAuth } from './context/AuthContext.tsx';


import { useSSE } from './context/SSEContext.tsx';
import { fetchInbox, fetchBugs } from './services/api.ts';
import { Bug } from '@triarc/shared-types';

export const App: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, isLoginModalOpen, setIsLoginModalOpen } = useAuth();
  const { lastEvent } = useSSE();

  // Modals state
  const [isNewBugOpen, setIsNewBugOpen] = useState(false);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isCmdOpen, setIsCmdOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  const [inboxCount, setInboxCount] = useState(0);
  const [recentBugs, setRecentBugs] = useState<Bug[]>([]);

  // Load inbox count for navbar badge
  const loadInboxCount = async () => {
    try {
      const res = await fetchInbox(currentUser?.id);
      setInboxCount(res.incoming?.length || 0);
    } catch {
      // Ignore
    }
  };

  // Load quick bug references for command palette
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

  // Global Keyboard Shortcuts (Ctrl+K, ?)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      // Ctrl+K (or Cmd+K) for Command Palette
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCmdOpen((prev) => !prev);
      }

      // '?' for Shortcuts (only outside input fields)
      if (!isInput && e.key === '?' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setIsShortcutsOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const isLandingPage = location.pathname === '/' || location.pathname === '/landing';
  const isLoginPage = location.pathname === '/login';
  const isPublicPage = isLandingPage || isLoginPage;



  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col relative selection:bg-foreground selection:text-background font-mono">
      {/* Background Dot Matrix Canvas */}
      <CyberBackground />

      {/* Top Navbar Header (Rendered on all authenticated app views) */}
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

      {/* Main Viewport Content */}
      <div className={isPublicPage ? 'flex-1' : 'flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6'}>
        <ErrorBoundary>
          <AppRoutes />
        </ErrorBoundary>
      </div>

      {/* Security Telemetry Footer (Floating or Collapsible) */}
      {!isPublicPage && <SecurityTelemetryFeed />}

      {/* Global Modals & Dialogs */}
      <NewBugModal
        isOpen={isNewBugOpen}
        onClose={() => setIsNewBugOpen(false)}
        onBugCreated={(newBugId) => {
          loadRecentBugs();
          navigate(`/projects/CORE/issues/${newBugId}`);
        }}
        onSelectBug={(id) => navigate(`/projects/CORE/issues/${id}`)}
      />

      <GitHubImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportComplete={() => {
          loadRecentBugs();
          navigate('/projects/CORE');
        }}
      />

      <WebhookSimulatorModal
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
        onSelectBug={(bugId) => {
          loadRecentBugs();
          loadInboxCount();
          navigate(`/projects/CORE/issues/${bugId}`);
        }}
      />

      <CommandPalette
        isOpen={isCmdOpen}
        onClose={() => setIsCmdOpen(false)}
        bugs={recentBugs}
        openNewBugModal={() => setIsNewBugOpen(true)}
        openWebhookSimulator={() => setIsSimulatorOpen(true)}
      />

      <KeyboardShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      {/* Interactive Roaming Desktop Pet & AI Sentinel */}
      <TomLizardPet />
      <CyberAssistantDrawer />

      <LoginModal />
    </div>
  );
};



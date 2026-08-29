import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar.tsx';
import { FilterBar } from './components/BugList/FilterBar.tsx';
import { TableView } from './components/BugList/TableView.tsx';
import { CardView } from './components/BugList/CardView.tsx';
import { BugDetailModal } from './components/BugDetail/BugDetailModal.tsx';
import { RequestInbox } from './components/Inbox/RequestInbox.tsx';
import { FlowAnalyticsView } from './components/Analytics/FlowAnalyticsView.tsx';
import { AdminPanelView } from './components/Admin/AdminPanelView.tsx';
import { NewBugModal } from './components/NewBug/NewBugModal.tsx';
import { GitHubImportModal } from './components/Import/GitHubImportModal.tsx';
import { LoginModal } from './components/Auth/LoginModal.tsx';
import { WebhookSimulatorModal } from './components/WebhookSimulator/WebhookSimulatorModal.tsx';
import { CommandPalette } from './components/CommandPalette.tsx';
import { DigestBanner } from './components/Digest/DigestBanner.tsx';
import { KeyboardShortcutsModal } from './components/KeyboardShortcuts/KeyboardShortcutsModal.tsx';
import { fetchBugs, fetchInbox } from './services/api.ts';
import { useAuth } from './context/AuthContext.tsx';
import { useSSE } from './context/SSEContext.tsx';
import { Bug } from '@triarc/shared-types';
import { Loader2 } from 'lucide-react';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';

export const App: React.FC = () => {
  const { currentUser, setIsLoginModalOpen } = useAuth();
  const { lastEvent } = useSSE();

  const [activeTab, setActiveTab] = useState<'bugs' | 'inbox' | 'analytics' | 'admin'>('bugs');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [componentFilter, setComponentFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');

  // Data
  const [bugs, setBugs] = useState<Bug[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [inboxCount, setInboxCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [selectedBugId, setSelectedBugId] = useState<number | null>(null);
  const [isNewBugOpen, setIsNewBugOpen] = useState(false);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isCmdOpen, setIsCmdOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  // Load bugs
  const loadBugs = () => {
    fetchBugs({
      query: searchQuery || undefined,
      status: statusFilter || undefined,
      component: componentFilter || undefined,
      priority: priorityFilter || undefined,
      assignee: assigneeFilter || undefined,
      userId: currentUser?.id
    })
      .then((res) => {
        setBugs(res.bugs);
        setTotalCount(res.count);
      })
      .catch((err) => {
        console.error('Failed to load bugs:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  // Load inbox count for badge
  const loadInboxCount = () => {
    fetchInbox(currentUser?.id)
      .then((res) => {
        setInboxCount(res.counts?.incoming || 0);
      })
      .catch(() => {});
  };

  useEffect(() => {
    setIsLoading(true);
    loadBugs();
  }, [searchQuery, statusFilter, componentFilter, priorityFilter, assigneeFilter, currentUser?.id]);

  useEffect(() => {
    loadInboxCount();
  }, [currentUser?.id]);

  // Handle live SSE updates
  useEffect(() => {
    if (lastEvent) {
      loadBugs();
      loadInboxCount();
    }
  }, [lastEvent]);

  // Global custom event listener to open login modal from menu
  useEffect(() => {
    const handleOpenLogin = () => setIsLoginModalOpen(true);
    document.addEventListener('triarc:open-login-modal', handleOpenLogin);
    return () => document.removeEventListener('triarc:open-login-modal', handleOpenLogin);
  }, [setIsLoginModalOpen]);

  // Global Keyboard Shortcuts (⌘K, ⌘N, ?)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      const targetTag = (e.target as HTMLElement)?.tagName;
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(targetTag);

      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCmdOpen((prev) => !prev);
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        setIsNewBugOpen(true);
      } else if (e.key === '?' && !isInput) {
        e.preventDefault();
        setIsShortcutsOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background text-slate-100 font-sans">
      {/* Skip to Main Content Link (WCAG 2.2 AA) */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[250] focus:px-4 focus:py-2 focus:bg-primary-600 focus:text-white focus:font-bold focus:rounded-lg focus:shadow-xl focus:ring-2 focus:ring-primary-400"
      >
        Skip to main content
      </a>

      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        openNewBugModal={() => setIsNewBugOpen(true)}
        openWebhookSimulator={() => setIsSimulatorOpen(true)}
        openImportModal={() => setIsImportModalOpen(true)}
        openCommandPalette={() => setIsCmdOpen(true)}
        openKeyboardShortcuts={() => setIsShortcutsOpen(true)}
        onSelectBug={(id) => setSelectedBugId(id)}
        inboxCount={inboxCount}
      />

      {/* Main Content Area */}
      <main id="main-content" className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-8">
        <ErrorBoundary fallbackTitle="Application View Error">
          {activeTab === 'bugs' && (
            <div>
              {/* Notifications Digest Banner (§6.H) */}
              <DigestBanner onSelectBug={(id) => setSelectedBugId(id)} />

              <FilterBar
                viewMode={viewMode}
                setViewMode={setViewMode}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                componentFilter={componentFilter}
                setComponentFilter={setComponentFilter}
                priorityFilter={priorityFilter}
                setPriorityFilter={setPriorityFilter}
                assigneeFilter={assigneeFilter}
                setAssigneeFilter={setAssigneeFilter}
                totalCount={totalCount}
              />

              {isLoading ? (
                <div className="p-20 flex flex-col items-center justify-center gap-3 text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
                  <p className="text-xs font-mono">Loading structured bug reports...</p>
                </div>
              ) : viewMode === 'table' ? (
                <TableView
                  bugs={bugs}
                  onSelectBug={(id) => setSelectedBugId(id)}
                  selectedBugId={selectedBugId}
                  onBugsUpdated={loadBugs}
                />
              ) : (
                <CardView
                  bugs={bugs}
                  onSelectBug={(id) => setSelectedBugId(id)}
                />
              )}
            </div>
          )}

          {activeTab === 'inbox' && (
            <RequestInbox onSelectBug={(id) => setSelectedBugId(id)} />
          )}

          {activeTab === 'analytics' && (
            <FlowAnalyticsView onSelectBug={(id) => setSelectedBugId(id)} />
          )}

          {activeTab === 'admin' && (
            <AdminPanelView />
          )}
        </ErrorBoundary>
      </main>

      {/* Modals */}
      <BugDetailModal
        bugId={selectedBugId}
        onClose={() => {
          setSelectedBugId(null);
          loadBugs();
        }}
        onSelectBug={(id) => setSelectedBugId(id)}
      />

      <NewBugModal
        isOpen={isNewBugOpen}
        onClose={() => setIsNewBugOpen(false)}
        onBugCreated={(id) => {
          loadBugs();
          setSelectedBugId(id);
        }}
        onSelectBug={(id) => setSelectedBugId(id)}
      />

      <GitHubImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportComplete={() => {
          loadBugs();
        }}
      />

      <LoginModal />

      <WebhookSimulatorModal
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
        onSelectBug={(id) => setSelectedBugId(id)}
      />

      <CommandPalette
        isOpen={isCmdOpen}
        onClose={() => setIsCmdOpen(false)}
        bugs={bugs}
        onSelectBug={(id) => setSelectedBugId(id)}
        setActiveTab={setActiveTab}
        openNewBugModal={() => setIsNewBugOpen(true)}
        openWebhookSimulator={() => setIsSimulatorOpen(true)}
      />

      <KeyboardShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />
    </div>
  );
};

import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import { LoginView } from '../views/LoginView.tsx';
import { LandingView } from '../views/LandingView.tsx';
import { ProjectsListView } from '../views/ProjectsListView.tsx';
import { ProjectIssuesView } from '../views/ProjectIssuesView.tsx';
import { IssueDetailView } from '../views/IssueDetailView.tsx';
import { ProjectAnalyticsView } from '../views/ProjectAnalyticsView.tsx';
import { ProjectSettingsView } from '../views/ProjectSettingsView.tsx';
import { InboxView } from '../views/InboxView.tsx';
import { AdminView } from '../views/AdminView.tsx';
import { WorkspaceChooserView, getWorkspaceMode } from '../views/WorkspaceChooserView.tsx';
import { GitHubWorkspaceView } from '../views/GitHubWorkspaceView.tsx';
import { Loader2, AlertCircle } from 'lucide-react';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-2 font-mono text-xs uppercase text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin text-[#ea580c]" />
        <span>INITIALIZING WORKSPACE...</span>
      </div>
    );
  }

  return <>{children}</>;
};

/**
 * Root sends returning users straight back to the workspace they last chose,
 * and first-time users to the chooser.
 */
const RootRoute: React.FC = () => {
  const mode = getWorkspaceMode();
  if (mode === 'personal') return <Navigate to="/github" replace />;
  if (mode === 'org') return <Navigate to="/projects" replace />;
  return <Navigate to="/workspace" replace />;
};


export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Landing & Login Routes */}
      <Route path="/landing" element={<LandingView />} />
      <Route path="/login" element={<LoginView />} />

      {/* Root route: / -> /projects if authenticated, /landing if unauthenticated */}
      <Route path="/" element={<RootRoute />} />

      {/* Workspace fork: organization tracker vs personal repo view */}
      <Route
        path="/workspace"
        element={
          <ProtectedRoute>
            <WorkspaceChooserView />
          </ProtectedRoute>
        }
      />

      <Route
        path="/github"
        element={
          <ProtectedRoute>
            <GitHubWorkspaceView />
          </ProtectedRoute>
        }
      />

      {/* Project Navigation Flow */}
      <Route
        path="/projects"
        element={
          <ProtectedRoute>
            <ProjectsListView />
          </ProtectedRoute>
        }
      />

      <Route
        path="/projects/:key"
        element={
          <ProtectedRoute>
            <ProjectIssuesView />
          </ProtectedRoute>
        }
      />

      <Route
        path="/projects/:key/issues/:id"
        element={
          <ProtectedRoute>
            <IssueDetailView />
          </ProtectedRoute>
        }
      />

      <Route
        path="/projects/:key/analytics"
        element={
          <ProtectedRoute>
            <ProjectAnalyticsView />
          </ProtectedRoute>
        }
      />

      <Route
        path="/projects/:key/settings"
        element={
          <ProtectedRoute>
            <ProjectSettingsView />
          </ProtectedRoute>
        }
      />

      {/* Cross-Project Inbox */}
      <Route
        path="/inbox"
        element={
          <ProtectedRoute>
            <InboxView />
          </ProtectedRoute>
        }
      />

      {/* Global Admin Console */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminView />
          </ProtectedRoute>
        }
      />

      {/* 404 Not Found Fallback */}
      <Route
        path="*"
        element={
          <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center font-mono space-y-4">
            <AlertCircle className="w-10 h-10 text-[#ea580c]" />
            <h1 className="text-base font-black uppercase text-foreground">404 — ROUTE NOT FOUND</h1>
            <p className="text-xs text-muted-foreground uppercase max-w-sm">
              The requested navigation path does not exist in the Triarc telemetry matrix.
            </p>
            <a
              href="/projects"
              className="px-4 py-2 bg-foreground text-background font-bold text-xs uppercase rounded-sm hover:bg-white transition-all"
            >
              RETURN TO PROJECTS
            </a>
          </div>
        }
      />
    </Routes>
  );
};

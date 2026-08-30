import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import { AdminPanelView } from '../components/Admin/AdminPanelView.tsx';
import { Shield, ShieldAlert, ArrowLeft } from 'lucide-react';

export const AdminView: React.FC = () => {
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'admin';

  if (!isAdmin) {
    return (
      <main id="main-content" className="space-y-6 font-mono p-6">
        <div className="p-12 text-center border border-border bg-[#0d0d0d] rounded-sm space-y-3">
          <ShieldAlert className="w-8 h-8 text-red-400 mx-auto" />
          <h1 className="text-sm font-bold uppercase text-foreground">Global Administrator Access Required</h1>
          <p className="text-xs text-muted-foreground uppercase max-w-md mx-auto">
            Your current account (@{currentUser?.username || 'user'}) lacks global administrator permissions.
          </p>
          <Link
            to="/projects"
            className="px-4 py-2 bg-foreground text-background font-bold text-xs uppercase inline-block rounded-sm mt-2"
          >
            RETURN TO PROJECTS
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="space-y-6 animate-fade-in font-mono" id="main-content">
      {/* Header Bar */}
      <div className="bg-[#0d0d0d] border border-border shadow-sm rounded-sm p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-purple-950 border border-purple-600 text-purple-300 flex items-center justify-center font-bold rounded-sm">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-purple-400 font-bold tracking-wider uppercase block">
                ROOT INSTITUTION CONSOLE
              </span>
              <h1 className="text-lg font-black text-foreground uppercase tracking-wide">
                System Administration & Governance
              </h1>
            </div>
          </div>
          <p className="text-xs text-muted-foreground uppercase">
            Manage global users, security groups, database integrity, webhook endpoints, and audit logs.
          </p>
        </div>

        <Link
          to="/projects"
          className="px-3 py-2 border border-border bg-[#121212] hover:bg-[#1f1f1f] text-foreground text-xs uppercase font-bold flex items-center gap-1.5 rounded-sm transition-all shrink-0"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>PROJECTS</span>
        </Link>
      </div>

      <AdminPanelView />
    </main>
  );
};

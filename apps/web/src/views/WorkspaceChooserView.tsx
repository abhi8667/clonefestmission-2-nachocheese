import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import {
  Building2,
  Github,
  ArrowRight,
  ShieldCheck,
  GitBranch,
  Inbox,
  Workflow,
  Activity
} from 'lucide-react';

const WORKSPACE_KEY = 'triarc_workspace_mode';

export function setWorkspaceMode(mode: 'org' | 'personal') {
  try {
    localStorage.setItem(WORKSPACE_KEY, mode);
  } catch {
    // Private browsing — the chooser still works, it just won't be remembered.
  }
}

export function getWorkspaceMode(): 'org' | 'personal' | null {
  try {
    const v = localStorage.getItem(WORKSPACE_KEY);
    return v === 'org' || v === 'personal' ? v : null;
  } catch {
    return null;
  }
}

export const WorkspaceChooserView: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const choose = (mode: 'org' | 'personal', path: string) => {
    setWorkspaceMode(mode);
    navigate(path);
  };

  return (
    <main id="main-content" className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
      <header className="mb-10">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#ea580c] mb-2">
          Choose your workspace
        </p>
        <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-foreground mb-2">
          Welcome back{currentUser?.name ? `, ${currentUser.name.split(' ')[0]}` : ''}
        </h1>
        <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
          Triarc runs two workspaces off one account. Pick where you're working — you can
          switch at any time from the navigation bar.
        </p>
      </header>

      <div className="grid gap-5 md:grid-cols-2">
        {/* Organization — the tracker */}
        <button
          onClick={() => choose('org', '/projects')}
          className="group text-left bg-[#0e0e0e] border-2 border-border hover:border-[#ea580c] p-6 transition-all focus-visible:ring-2 focus-visible:ring-[#ea580c] outline-none flex flex-col"
        >
          <div className="flex items-start justify-between mb-5">
            <span className="w-11 h-11 grid place-items-center bg-[#1a1a1a] border border-border group-hover:border-[#ea580c] transition-colors">
              <Building2 className="w-5 h-5 text-[#ea580c]" />
            </span>
            <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-1 bg-[#1a1a1a] text-muted-foreground border border-border">
              Team
            </span>
          </div>

          <h2 className="text-base font-black uppercase tracking-wide text-foreground mb-2">
            Organization workspace
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed mb-5 flex-1">
            The full incident tracker — structured triage, guarded state transitions, request
            and approval flags, row-level security groups, and a complete audit trail.
          </p>

          <ul className="space-y-2 mb-6">
            {[
              [Workflow, 'Guarded workflow state machine'],
              [Inbox, 'Request & approval inbox'],
              [ShieldCheck, 'Security groups & audit log']
            ].map(([Icon, label]: any, i) => (
              <li key={i} className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <Icon className="w-3.5 h-3.5 text-[#ea580c] shrink-0" />
                {label}
              </li>
            ))}
          </ul>

          <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-foreground group-hover:text-[#ea580c] transition-colors">
            Enter workspace <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </button>

        {/* Personal — the repo graph */}
        <button
          onClick={() => choose('personal', '/github')}
          className="group text-left bg-[#0e0e0e] border-2 border-border hover:border-emerald-500 p-6 transition-all focus-visible:ring-2 focus-visible:ring-emerald-500 outline-none flex flex-col"
        >
          <div className="flex items-start justify-between mb-5">
            <span className="w-11 h-11 grid place-items-center bg-[#1a1a1a] border border-border group-hover:border-emerald-500 transition-colors">
              <Github className="w-5 h-5 text-emerald-400" />
            </span>
            <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-1 bg-[#1a1a1a] text-muted-foreground border border-border">
              Personal
            </span>
          </div>

          <h2 className="text-base font-black uppercase tracking-wide text-foreground mb-2">
            GitHub project
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed mb-5 flex-1">
            Point Triarc at a repository and see its shape — the trunk as one continuous line,
            every branch diverging and merging back on a real time axis.
          </p>

          <ul className="space-y-2 mb-6">
            {[
              [GitBranch, 'Branch network over time'],
              [Activity, 'Commit stream & contributors'],
              [ShieldCheck, 'Sleeper-branch detection']
            ].map(([Icon, label]: any, i) => (
              <li key={i} className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <Icon className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                {label}
              </li>
            ))}
          </ul>

          <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-foreground group-hover:text-emerald-400 transition-colors">
            Open repo view <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </button>
      </div>

      <p className="mt-8 text-[11px] text-muted-foreground">
        Signed in as <span className="text-foreground font-bold">@{currentUser?.username ?? 'guest'}</span>
        {currentUser?.role && <> · role <span className="text-foreground">{currentUser.role}</span></>}
        {' · '}
        <Link to="/projects" className="underline hover:text-foreground">skip to projects</Link>
      </p>
    </main>
  );
};

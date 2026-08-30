import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import { fetchProjectByKey } from '../services/api.ts';
import { FlowAnalyticsView } from '../components/Analytics/FlowAnalyticsView.tsx';
import { Project } from '@triarc/shared-types';
import { Activity, TrendingUp, Settings, ArrowLeft } from 'lucide-react';

export const ProjectAnalyticsView: React.FC = () => {
  const { key = 'CORE' } = useParams<{ key: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [project, setProject] = useState<Project | null>(null);

  useEffect(() => {
    fetchProjectByKey(key, currentUser?.id)
      .then((res) => setProject(res.project))
      .catch((err) => console.error('Failed to load project:', err));
  }, [key, currentUser?.id]);

  const handleSelectBug = (bugId: number) => {
    navigate(`/projects/${key.toUpperCase()}/issues/${bugId}`);
  };

  const isProjectAdmin = project?.user_role === 'admin' || currentUser?.role === 'admin';

  return (
    <main className="space-y-6 animate-fade-in font-mono" id="main-content">
      {/* Project Sub-Navigation & Header Bar */}
      <div className="bg-[#0d0d0d] border border-border shadow-sm rounded-sm overflow-hidden">
        <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <Link
                to="/projects"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors uppercase font-bold flex items-center gap-1"
              >
                <span>PROJECTS</span>
                <span>/</span>
              </Link>
              <span className="px-2 py-0.5 bg-foreground text-background font-bold text-xs uppercase rounded-xs">
                {key.toUpperCase()}
              </span>
              <span
                className={`px-1.5 py-0.2 text-[9px] font-bold uppercase border rounded-xs ${
                  project?.user_role === 'admin'
                    ? 'bg-purple-950 text-purple-300 border-purple-600'
                    : project?.user_role === 'triager'
                    ? 'bg-amber-950 text-amber-300 border-amber-600'
                    : 'bg-blue-950 text-blue-300 border-blue-600'
                }`}
              >
                ROLE: {project?.user_role || 'MEMBER'}
              </span>
            </div>

            <h1 className="text-xl font-black text-foreground uppercase tracking-tight">
              {project?.name || `${key.toUpperCase()} WORKSPACE`} FLOW ANALYTICS
            </h1>
            <p className="text-xs text-muted-foreground uppercase">
              Cumulative flow diagram, stage latency telemetry, SLA compliance, and sleeper branch diagnostics.
            </p>
          </div>
        </div>

        {/* Project View Tabs Bar */}
        <nav aria-label="Project Sections" className="flex items-center px-5 gap-1 bg-[#101010] text-xs">
          <Link
            to={`/projects/${key}`}
            className="py-3 px-4 font-bold border-b-2 border-transparent text-muted-foreground hover:text-foreground hover:border-border flex items-center gap-2 uppercase transition-all"
          >
            <Activity className="w-4 h-4" />
            <span>ISSUES</span>
          </Link>

          <Link
            to={`/projects/${key}/analytics`}
            className="py-3 px-4 font-bold border-b-2 border-foreground text-foreground flex items-center gap-2 uppercase"
          >
            <TrendingUp className="w-4 h-4 text-[#ea580c]" />
            <span>FLOW ANALYTICS</span>
          </Link>

          {isProjectAdmin && (
            <Link
              to={`/projects/${key}/settings`}
              className="py-3 px-4 font-bold border-b-2 border-transparent text-muted-foreground hover:text-foreground hover:border-border flex items-center gap-2 uppercase transition-all ml-auto"
            >
              <Settings className="w-4 h-4" />
              <span>SETTINGS</span>
            </Link>
          )}
        </nav>
      </div>

      {/* Scoped Flow Analytics Component */}
      <FlowAnalyticsView onSelectBug={handleSelectBug} project={key} />
    </main>
  );
};

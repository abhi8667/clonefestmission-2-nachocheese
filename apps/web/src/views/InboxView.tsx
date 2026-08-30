import React from 'react';
import { useNavigate } from 'react-router-dom';
import { RequestInbox } from '../components/Inbox/RequestInbox.tsx';
import { Inbox, ArrowLeft } from 'lucide-react';

export const InboxView: React.FC = () => {
  const navigate = useNavigate();

  const handleSelectBug = (bugId: number) => {
    // Default to CORE or lookup
    navigate(`/projects/CORE/issues/${bugId}`);
  };

  return (
    <main className="space-y-6 animate-fade-in font-mono" id="main-content">
      {/* Header Bar */}
      <div className="bg-[#0d0d0d] border border-border shadow-sm rounded-sm p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-foreground text-background flex items-center justify-center font-bold rounded-sm">
              <Inbox className="w-4 h-4 text-background" />
            </div>
            <div>
              <span className="text-[10px] text-[#ea580c] font-bold tracking-wider uppercase block">
                CROSS-PROJECT INBOX
              </span>
              <h1 className="text-lg font-black text-foreground uppercase tracking-wide">
                Requests & Approvals Queue
              </h1>
            </div>
          </div>
          <p className="text-xs text-muted-foreground uppercase">
            Manage incoming review?, needinfo?, and approval? requests across all project workspaces.
          </p>
        </div>

        <button
          onClick={() => navigate('/projects')}
          className="px-3 py-2 border border-border bg-[#121212] hover:bg-[#1f1f1f] text-foreground text-xs uppercase font-bold flex items-center gap-1.5 rounded-sm transition-all shrink-0"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>ALL PROJECTS</span>
        </button>
      </div>

      {/* Cross-Project Request Inbox */}
      <RequestInbox onSelectBug={handleSelectBug} />
    </main>
  );
};

import React from 'react';
import { Search, Table, LayoutGrid, Filter, X, HelpCircle } from 'lucide-react';

interface FilterBarProps {
  viewMode: 'table' | 'cards';
  setViewMode: (mode: 'table' | 'cards') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  componentFilter: string;
  setComponentFilter: (comp: string) => void;
  priorityFilter: string;
  setPriorityFilter: (prio: string) => void;
  assigneeFilter: string;
  setAssigneeFilter: (ass: string) => void;
  totalCount: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  viewMode,
  setViewMode,
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  componentFilter,
  setComponentFilter,
  priorityFilter,
  setPriorityFilter,
  assigneeFilter,
  setAssigneeFilter,
  totalCount
}) => {
  const [showHelp, setShowHelp] = React.useState(false);

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('');
    setComponentFilter('');
    setPriorityFilter('');
    setAssigneeFilter('');
  };

  const hasActiveFilters = searchQuery || statusFilter || componentFilter || priorityFilter || assigneeFilter;

  return (
    <div className="space-y-3 mb-4">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-surface-50/70 p-2.5 rounded-xl border border-slate-800/80 shadow-sm">
        {/* Left: Search query input with helper */}
        <div className="flex-1 min-w-[260px] relative flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-3" />
          <input
            type="text"
            placeholder='Search (e.g. status:open assignee:me priority:high "save crash")...'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-1.5 bg-surface-100/90 border border-slate-700/60 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 transition-all"
          />
          {searchQuery ? (
            <button onClick={() => setSearchQuery('')} className="absolute right-2.5 text-slate-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={() => setShowHelp(!showHelp)}
              className="absolute right-2.5 text-slate-500 hover:text-primary-400"
              title="Search syntax guide"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Middle: Dropdown Selects */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Select */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-surface-100 border border-slate-700/60 text-slate-300 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-primary-500 font-sans"
          >
            <option value="">All Statuses</option>
            <option value="open">All Open (Active)</option>
            <option value="closed">All Closed / Resolved</option>
            <option value="Unconfirmed">Unconfirmed</option>
            <option value="Confirmed">Confirmed</option>
            <option value="In Progress">In Progress</option>
            <option value="In Review">In Review</option>
            <option value="Resolved">Resolved</option>
            <option value="Verified">Verified</option>
            <option value="Closed">Closed</option>
            <option value="Duplicate">Duplicate</option>
            <option value="WontFix">WontFix</option>
          </select>

          {/* Component Select */}
          <select
            value={componentFilter}
            onChange={(e) => setComponentFilter(e.target.value)}
            className="bg-surface-100 border border-slate-700/60 text-slate-300 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-primary-500 font-sans"
          >
            <option value="">All Components</option>
            <option value="core">Core Engine</option>
            <option value="auth">Auth & Security</option>
            <option value="ui">Web Client</option>
            <option value="api">REST & SSE Gateway</option>
            <option value="db">Storage & Persistence</option>
            <option value="git">GitHub Integration</option>
          </select>

          {/* Priority Select */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-surface-100 border border-slate-700/60 text-slate-300 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-primary-500 font-sans"
          >
            <option value="">All Priorities</option>
            <option value="highest">Highest</option>
            <option value="high">High</option>
            <option value="normal">Normal</option>
            <option value="low">Low</option>
            <option value="lowest">Lowest</option>
          </select>

          {/* Assignee Select */}
          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="bg-surface-100 border border-slate-700/60 text-slate-300 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-primary-500 font-sans"
          >
            <option value="">All Assignees</option>
            <option value="me">Assigned to Me</option>
            <option value="unassigned">Unassigned</option>
            <option value="u_alex">Alex River</option>
            <option value="u_sam">Sam Patel</option>
            <option value="u_priya">Priya Sharma</option>
            <option value="u_marcus">Marcus Vance</option>
          </select>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-rose-400 hover:text-rose-300 px-2 py-1 rounded bg-rose-500/10 border border-rose-500/20 flex items-center gap-1"
            >
              <X className="w-3 h-3" /> Reset
            </button>
          )}
        </div>

        {/* Right: View mode toggler (Table vs Kanban Cards) */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-mono mr-1">
            {totalCount} bugs
          </span>
          <div className="flex items-center bg-surface-100 rounded-lg p-0.5 border border-slate-800">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md text-xs transition-all ${
                viewMode === 'table' ? 'bg-primary-600/30 text-white border border-primary-500/40 shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Dense Table view (Power user default)"
            >
              <Table className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded-md text-xs transition-all ${
                viewMode === 'cards' ? 'bg-primary-600/30 text-white border border-primary-500/40 shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Card / Kanban status view"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Search syntax helper dropdown */}
      {showHelp && (
        <div className="p-3 bg-surface-100 border border-slate-700/80 rounded-xl text-xs space-y-1.5 animate-slide-up text-slate-300">
          <p className="font-bold text-white flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-primary-400" />
            Typed Search Syntax (Bugzilla Power Search Rebuilt):
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 text-[11px] font-mono text-slate-400 pt-1">
            <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
              <span className="text-primary-300 font-bold">status:open</span> / <span className="text-primary-300 font-bold">status:closed</span>
            </div>
            <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
              <span className="text-cyan-300 font-bold">assignee:me</span> / <span className="text-cyan-300 font-bold">assignee:alex</span>
            </div>
            <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
              <span className="text-amber-300 font-bold">priority:high</span> / <span className="text-rose-300 font-bold">severity:critical</span>
            </div>
            <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
              <span className="text-purple-300 font-bold">changedto:Resolved</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

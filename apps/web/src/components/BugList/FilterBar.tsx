import React, { useState, useEffect } from 'react';
import { Search, Table, LayoutGrid, Filter, X, HelpCircle, Bookmark, Plus, Trash2, Tag, Eye } from 'lucide-react';
import { fetchSavedSearches, createSavedSearch, deleteSavedSearch, fetchMilestones } from '../../services/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';

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
  const { currentUser } = useAuth();
  const [showHelp, setShowHelp] = useState(false);
  const [showSavedSearches, setShowSavedSearches] = useState(false);
  const [savedSearches, setSavedSearches] = useState<any[]>([]);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [selectedMilestone, setSelectedMilestone] = useState('');
  const [newSearchName, setNewSearchName] = useState('');
  const [isSavingSearch, setIsSavingSearch] = useState(false);

  const loadSavedSearches = async () => {
    try {
      const data = await fetchSavedSearches(currentUser?.id);
      setSavedSearches(data.saved_searches || []);
    } catch (err) {}
  };

  const loadMilestones = async () => {
    try {
      const data = await fetchMilestones();
      setMilestones(data.milestones || []);
    } catch (err) {}
  };

  useEffect(() => {
    loadSavedSearches();
    loadMilestones();
  }, [currentUser]);

  const handleSaveSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSearchName.trim()) return;
    const queryToSave = searchQuery.trim() || `status:${statusFilter || 'open'}`;
    try {
      await createSavedSearch(newSearchName.trim(), queryToSave, currentUser?.id);
      setNewSearchName('');
      setIsSavingSearch(false);
      loadSavedSearches();
    } catch (err) {}
  };

  const handleDeleteSavedSearch = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteSavedSearch(id, currentUser?.id);
      loadSavedSearches();
    } catch (err) {}
  };

  const handleApplySavedSearch = (query: string) => {
    setSearchQuery(query);
    setShowSavedSearches(false);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('');
    setComponentFilter('');
    setPriorityFilter('');
    setAssigneeFilter('');
    setSelectedMilestone('');
  };

  const toggleKeywordChip = (keyword: string) => {
    const token = `keyword:${keyword}`;
    if (searchQuery.includes(token)) {
      setSearchQuery(searchQuery.replace(token, '').trim());
    } else {
      setSearchQuery(`${searchQuery} ${token}`.trim());
    }
  };

  const toggleWatchedChip = () => {
    const token = 'is:watched';
    if (searchQuery.includes(token)) {
      setSearchQuery(searchQuery.replace(token, '').trim());
    } else {
      setSearchQuery(`${searchQuery} ${token}`.trim());
    }
  };

  const handleMilestoneChange = (ms: string) => {
    setSelectedMilestone(ms);
    if (!ms) {
      const cleaned = searchQuery.replace(/milestone:\S+/g, '').trim();
      setSearchQuery(cleaned);
    } else {
      const cleaned = searchQuery.replace(/milestone:\S+/g, '').trim();
      setSearchQuery(`${cleaned} milestone:${ms}`.trim());
    }
  };

  const hasActiveFilters = searchQuery || statusFilter || componentFilter || priorityFilter || assigneeFilter || selectedMilestone;

  const quickKeywords = [
    { name: 'regression', color: 'text-rose-400 border-rose-500/30 bg-rose-500/10' },
    { name: 'perf', color: 'text-amber-400 border-amber-500/30 bg-amber-500/10' },
    { name: 'crash', color: 'text-red-400 border-red-500/30 bg-red-500/10' },
    { name: 'security', color: 'text-purple-400 border-purple-500/30 bg-purple-500/10' },
    { name: 'ux', color: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10' },
    { name: 'help-wanted', color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' }
  ];

  return (
    <div className="space-y-2.5 mb-4">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-surface-50/70 p-2.5 rounded-xl border border-slate-800/80 shadow-sm">
        {/* Left: Search query input with helper & Saved Searches */}
        <div className="flex-1 min-w-[260px] relative flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-3" />
          <input
            type="text"
            placeholder='Search (e.g. status:open milestone:v2.1 keyword:crash "save error")...'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-16 py-1.5 bg-surface-100/90 border border-slate-700/60 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 transition-all"
          />
          <div className="absolute right-2.5 flex items-center gap-1.5">
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-white" title="Clear query">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => setShowSavedSearches(!showSavedSearches)}
              className={`p-1 rounded transition-colors ${showSavedSearches ? 'text-primary-400 bg-primary-500/20' : 'text-slate-400 hover:text-primary-300'}`}
              title="Saved searches & Smart Filters"
            >
              <Bookmark className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setShowHelp(!showHelp)}
              className="text-slate-500 hover:text-primary-400"
              title="Search syntax guide"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>
          </div>
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

          {/* Milestone Select */}
          <select
            value={selectedMilestone}
            onChange={(e) => handleMilestoneChange(e.target.value)}
            className="bg-surface-100 border border-slate-700/60 text-slate-300 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-primary-500 font-sans"
          >
            <option value="">All Milestones</option>
            {milestones.map((m) => (
              <option key={m.id} value={m.name}>
                {m.name} ({m.open_bugs_count || 0} open)
              </option>
            ))}
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

      {/* Quick Filter Chips (§3 Capability) */}
      <div className="flex flex-wrap items-center gap-1.5 px-1">
        <span className="text-[11px] text-slate-500 font-mono mr-1 flex items-center gap-1">
          <Tag className="w-3 h-3" /> Quick filters:
        </span>
        <button
          onClick={toggleWatchedChip}
          className={`px-2 py-0.5 rounded-md text-[11px] font-mono border transition-all flex items-center gap-1 ${
            searchQuery.includes('is:watched')
              ? 'bg-primary-500/20 text-primary-300 border-primary-500/40'
              : 'bg-surface-100/60 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-300'
          }`}
        >
          <Eye className="w-3 h-3" /> Watched by me
        </button>
        {quickKeywords.map((kw) => {
          const isActive = searchQuery.includes(`keyword:${kw.name}`);
          return (
            <button
              key={kw.name}
              onClick={() => toggleKeywordChip(kw.name)}
              className={`px-2 py-0.5 rounded-md text-[11px] font-mono border transition-all ${
                isActive ? `${kw.color} font-bold shadow-sm` : 'bg-surface-100/60 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-300'
              }`}
            >
              #{kw.name}
            </button>
          );
        })}
      </div>

      {/* Saved Searches Popover Panel */}
      {showSavedSearches && (
        <div className="p-3 bg-surface-100 border border-slate-700/80 rounded-xl text-xs space-y-2 animate-slide-up text-slate-300">
          <div className="flex items-center justify-between pb-1 border-b border-slate-800">
            <span className="font-bold text-white flex items-center gap-1.5">
              <Bookmark className="w-3.5 h-3.5 text-primary-400" />
              Saved Searches & Views
            </span>
            <button
              onClick={() => setIsSavingSearch(!isSavingSearch)}
              className="text-[11px] text-primary-400 hover:text-primary-300 flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> Save current view
            </button>
          </div>

          {isSavingSearch && (
            <form onSubmit={handleSaveSearch} className="flex gap-2 pt-1 pb-2">
              <input
                type="text"
                placeholder="Search name (e.g. My Sprint Blockers)..."
                value={newSearchName}
                onChange={(e) => setNewSearchName(e.target.value)}
                className="flex-1 px-2.5 py-1 bg-surface-200 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-primary-500"
                autoFocus
              />
              <button
                type="submit"
                className="px-3 py-1 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-xs font-semibold"
              >
                Save
              </button>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-1">
            {savedSearches.length === 0 ? (
              <p className="text-slate-500 col-span-3 py-2 text-center font-mono text-[11px]">
                No saved searches yet. Save your favorite queries for 1-click retrieval!
              </p>
            ) : (
              savedSearches.map((s) => (
                <div
                  key={s.id}
                  onClick={() => handleApplySavedSearch(s.query)}
                  className="p-2 rounded-lg bg-surface-200/80 hover:bg-surface-200 border border-slate-700/60 hover:border-primary-500/50 cursor-pointer flex items-center justify-between transition-all group"
                >
                  <div>
                    <p className="font-semibold text-slate-200 text-xs">{s.name}</p>
                    <p className="font-mono text-[10px] text-slate-400 truncate max-w-[200px]">{s.query}</p>
                  </div>
                  <button
                    onClick={(e) => handleDeleteSavedSearch(s.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 transition-opacity"
                    title="Delete saved search"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

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
              <span className="text-cyan-300 font-bold">milestone:v2.1</span> / <span className="text-cyan-300 font-bold">version:2.0.4</span>
            </div>
            <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
              <span className="text-amber-300 font-bold">keyword:crash</span> / <span className="text-rose-300 font-bold">is:watched</span>
            </div>
            <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
              <span className="text-purple-300 font-bold">assignee:me</span> / <span className="text-purple-300 font-bold">changedto:Resolved</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

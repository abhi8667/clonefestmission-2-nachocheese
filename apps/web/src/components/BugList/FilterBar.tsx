import React, { useState, useEffect } from 'react';
import {
  Search,
  Table,
  LayoutGrid,
  Filter,
  X,
  HelpCircle,
  Bookmark,
  Plus,
  Trash2,
  Tag,
  Eye,
  SlidersHorizontal,
  Sparkles,
  Shield,
  Activity
} from 'lucide-react';
import { fetchSavedSearches, createSavedSearch, deleteSavedSearch, fetchMilestones } from '../../services/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { AnimatedCounter } from '../Cyber/AnimatedCounter.tsx';

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
    } catch (err) { }
  };

  const loadMilestones = async () => {
    try {
      const data = await fetchMilestones();
      setMilestones(data.milestones || []);
    } catch (err) { }
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
    } catch (err) { }
  };

  const handleDeleteSavedSearch = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteSavedSearch(id, currentUser?.id);
      loadSavedSearches();
    } catch (err) { }
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

  const hasActiveFilters =
    searchQuery || statusFilter || componentFilter || priorityFilter || assigneeFilter || selectedMilestone;

  const quickKeywords = [
    { name: 'security', label: '#SECURITY', activeClass: 'bg-[#B497CF] text-foreground border-[#B497CF]' },
    { name: 'crash', label: '#CRASH', activeClass: 'bg-red-600 text-white border-red-500' },
    { name: 'regression', label: '#REGRESSION', activeClass: 'bg-amber-600 text-black border-amber-400' },
    { name: 'perf', label: '#PERF', activeClass: 'bg-foreground text-background border-foreground' },
    { name: 'ux', label: '#UX', activeClass: 'bg-foreground text-background border-foreground' },
    { name: 'help-wanted', label: '#HELP_WANTED', activeClass: 'bg-emerald-600 text-black border-emerald-400' }
  ];

  return (
    <div className="space-y-3 mb-6">
      {/* Main Command Console Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3.5 bg-[#0d0d0d] p-4 border border-border shadow-sm rounded-sm">
        {/* Left: Query Input */}
        <div className="flex-1 min-w-[280px] relative flex items-center">
          <div className="absolute left-3 flex items-center justify-center text-muted-foreground">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder='Search incidents, e.g. status:open milestone:v2.1 keyword:security...'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-20 py-2 bg-[#080808] border border-border text-xs font-mono text-foreground placeholder-muted-foreground focus:outline-none focus:border-foreground transition-all rounded-sm"
          />
          <div className="absolute right-2.5 flex items-center gap-1.5">
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-muted-foreground hover:text-foreground"
                title="Clear query"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => setShowSavedSearches(!showSavedSearches)}
              className={`p-1 border text-xs font-mono transition-colors rounded-sm ${showSavedSearches
                  ? 'text-background bg-foreground border-foreground'
                  : 'text-muted-foreground hover:text-foreground border-border'
                }`}
              title="Saved searches"
            >
              <Bookmark className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setShowHelp(!showHelp)}
              className="text-muted-foreground hover:text-foreground p-1"
              title="Command syntax guide"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Middle: Select Filter Hub */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Select */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#080808] border border-border text-foreground text-xs px-2.5 py-1.5 focus:outline-none focus:border-foreground font-mono uppercase rounded-sm"
          >
            <option value="">STATUS: ALL</option>
            <option value="open">STATUS: OPEN</option>
            <option value="closed">STATUS: CLOSED</option>
            <option value="Unconfirmed">UNCONFIRMED</option>
            <option value="Confirmed">CONFIRMED</option>
            <option value="In Progress">IN PROGRESS</option>
            <option value="In Review">IN REVIEW</option>
            <option value="Resolved">RESOLVED (FIXED)</option>
            <option value="Verified">VERIFIED</option>
            <option value="Closed">CLOSED</option>
            <option value="Duplicate">DUPLICATE</option>
            <option value="WontFix">WONTFIX</option>
          </select>

          {/* Milestone Select */}
          <select
            value={selectedMilestone}
            onChange={(e) => handleMilestoneChange(e.target.value)}
            className="bg-[#080808] border border-border text-foreground text-xs px-2.5 py-1.5 focus:outline-none focus:border-foreground font-mono uppercase rounded-sm"
          >
            <option value="">MILESTONES: ALL</option>
            {milestones.map((m) => (
              <option key={m.id} value={m.name}>
                {m.name.toUpperCase()} ({m.open_bugs_count || 0} ACTIVE)
              </option>
            ))}
          </select>

          {/* Component Select */}
          <select
            value={componentFilter}
            onChange={(e) => setComponentFilter(e.target.value)}
            className="bg-[#080808] border border-border text-foreground text-xs px-2.5 py-1.5 focus:outline-none focus:border-foreground font-mono uppercase rounded-sm"
          >
            <option value="">SUBSYSTEM: ALL</option>
            <option value="core">CORE ENGINE</option>
            <option value="auth">AUTH & SECURITY</option>
            <option value="ui">WEB CLIENT</option>
            <option value="api">API GATEWAY</option>
            <option value="db">STORAGE & DB</option>
            <option value="git">GITHUB SYNC</option>
          </select>

          {/* Priority Select */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-[#080808] border border-border text-foreground text-xs px-2.5 py-1.5 focus:outline-none focus:border-foreground font-mono uppercase rounded-sm"
          >
            <option value="">PRIORITY: ALL</option>
            <option value="highest">P1 // HIGHEST</option>
            <option value="high">P2 // HIGH</option>
            <option value="normal">P3 // NORMAL</option>
            <option value="low">P4 // LOW</option>
            <option value="lowest">P5 // LOWEST</option>
          </select>

          {/* Assignee Select */}
          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="bg-[#080808] border border-border text-foreground text-xs px-2.5 py-1.5 focus:outline-none focus:border-foreground font-mono uppercase rounded-sm"
          >
            <option value="">ASSIGNEE: ALL</option>
            <option value="me">ASSIGNED TO ME</option>
            <option value="unassigned">UNASSIGNED</option>
            <option value="u_alex">@ALEX RIVER</option>
            <option value="u_sam">@SAM PATEL</option>
            <option value="u_priya">@PRIYA SHARMA</option>
            <option value="u_marcus">@MARCUS VANCE</option>
            <option value="u_sarah">@SARAH CHEN</option>
          </select>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-[#B497CF] hover:text-white px-2.5 py-1.5 bg-[#B497CF]/10 border border-[#B497CF] flex items-center gap-1 font-mono uppercase font-bold transition-all rounded-sm"
            >
              <X className="w-3.5 h-3.5" /> RESET
            </button>
          )}
        </div>

        {/* Right: View mode HUD & Count */}
        <div className="flex items-center gap-2.5">
          <div className="px-3 py-1.5 border border-border bg-[#080808] text-xs font-mono text-foreground flex items-center gap-1.5 rounded-sm">
            <span className="w-1.5 h-1.5 bg-[#B497CF] animate-blink rounded-full" />
            <AnimatedCounter value={totalCount} suffix=" INCIDENTS" />
          </div>

          <div className="flex items-center border border-border bg-[#080808] rounded-sm overflow-hidden">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 text-xs transition-all ${viewMode === 'table'
                  ? 'bg-foreground text-background font-bold'
                  : 'text-muted-foreground hover:text-foreground'
                }`}
              title="Table view"
            >
              <Table className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 text-xs transition-all ${viewMode === 'cards'
                  ? 'bg-foreground text-background font-bold'
                  : 'text-muted-foreground hover:text-foreground'
                }`}
              title="Card grid view"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Quick Brutalist Filter Chips */}
      <div className="flex flex-wrap items-center gap-2 px-1">
        <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest flex items-center gap-1">
          // TAGS:
        </span>
        <button
          onClick={toggleWatchedChip}
          className={`px-2 py-0.5 text-[10px] font-mono uppercase border transition-all flex items-center gap-1 ${searchQuery.includes('is:watched')
              ? 'bg-foreground text-background border-foreground font-bold'
              : 'bg-[#0d0d0d] text-muted-foreground border-border hover:border-foreground hover:text-foreground'
            }`}
        >
          <Eye className="w-3 h-3" /> WATCHED_BY_ME
        </button>
        {quickKeywords.map((kw) => {
          const isActive = searchQuery.includes(`keyword:${kw.name}`);
          return (
            <button
              key={kw.name}
              onClick={() => toggleKeywordChip(kw.name)}
              className={`px-2 py-0.5 text-[10px] font-mono uppercase border transition-all ${isActive
                  ? `${kw.activeClass} font-bold`
                  : 'bg-[#0d0d0d] text-muted-foreground border-border hover:border-foreground hover:text-foreground'
                }`}
            >
              {kw.label}
            </button>
          );
        })}
      </div>

      {/* Saved Searches Popover Panel */}
      {showSavedSearches && (
        <div className="p-4 bg-[#0d0d0d] border-2 border-foreground shadow-brutalist text-xs space-y-3 animate-slide-up text-foreground">
          <div className="flex items-center justify-between pb-2 border-b-2 border-foreground/20">
            <span className="font-bold font-mono text-foreground flex items-center gap-2 uppercase">
              <Bookmark className="w-4 h-4 text-[#B497CF]" />
              // SAVED TELEMETRY VIEWS
            </span>
            <button
              onClick={() => setIsSavingSearch(!isSavingSearch)}
              className="text-xs font-mono text-[#B497CF] hover:text-white flex items-center gap-1 uppercase"
            >
              <Plus className="w-3.5 h-3.5" /> SAVE ACTIVE VIEW
            </button>
          </div>

          {isSavingSearch && (
            <form onSubmit={handleSaveSearch} className="flex gap-2 pt-1 pb-2">
              <input
                type="text"
                placeholder="VIEW NAME // e.g. SPRINT_VULNS..."
                value={newSearchName}
                onChange={(e) => setNewSearchName(e.target.value)}
                className="flex-1 px-3 py-1.5 bg-[#080808] border-2 border-foreground/30 text-xs font-mono text-foreground focus:outline-none focus:border-foreground uppercase"
                autoFocus
              />
              <button
                type="submit"
                className="px-4 py-1.5 bg-foreground text-background font-bold text-xs font-mono uppercase hover:bg-white"
              >
                SAVE
              </button>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-1">
            {savedSearches.length === 0 ? (
              <p className="text-muted-foreground col-span-3 py-3 text-center font-mono text-[11px] uppercase">
                NO SAVED TELEMETRY VIEWS RECORDED
              </p>
            ) : (
              savedSearches.map((s) => (
                <div
                  key={s.id}
                  onClick={() => handleApplySavedSearch(s.query)}
                  className="p-2.5 border-2 border-border hover:border-foreground bg-[#111111] cursor-pointer flex items-center justify-between transition-all group"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-foreground text-xs uppercase truncate">{s.name}</p>
                    <p className="font-mono text-[10px] text-[#B497CF] truncate mt-0.5">{s.query}</p>
                  </div>
                  <button
                    onClick={(e) => handleDeleteSavedSearch(s.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-red-400"
                    title="Delete saved view"
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
        <div className="p-4 bg-[#0d0d0d] border-2 border-foreground shadow-brutalist text-xs space-y-2 animate-slide-up text-foreground">
          <p className="font-bold font-mono text-foreground flex items-center gap-2 uppercase">
            <Filter className="w-4 h-4 text-[#B497CF]" />
            // TYPED RADAR SEARCH SYNTAX GUIDE:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 text-[11px] font-mono text-muted-foreground pt-1">
            <div className="p-2 border border-border bg-[#080808]">
              <span className="text-foreground font-bold">status:open</span> / <span className="text-foreground font-bold">status:closed</span>
            </div>
            <div className="p-2 border border-border bg-[#080808]">
              <span className="text-foreground font-bold">milestone:v2.1</span> / <span className="text-foreground font-bold">version:2.0</span>
            </div>
            <div className="p-2 border border-border bg-[#080808]">
              <span className="text-[#B497CF] font-bold">keyword:security</span> / <span className="text-foreground font-bold">is:watched</span>
            </div>
            <div className="p-2 border border-border bg-[#080808]">
              <span className="text-foreground font-bold">assignee:me</span> / <span className="text-foreground font-bold">priority:highest</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

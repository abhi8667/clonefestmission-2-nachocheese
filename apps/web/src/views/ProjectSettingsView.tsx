import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import {
  fetchProjectByKey,
  updateProject,
  addProjectComponent,
  updateProjectMember,
  removeProjectMember
} from '../services/api.ts';
import { Project, Component, ProjectMember, UserRole } from '@triarc/shared-types';
import {
  Settings,
  Activity,
  TrendingUp,
  Save,
  Plus,
  Trash2,
  Users,
  Layers,
  GitBranch,
  Shield,
  AlertCircle,
  CheckCircle2,
  Loader2
} from 'lucide-react';

export const ProjectSettingsView: React.FC = () => {
  const { key = 'CORE' } = useParams<{ key: string }>();
  const navigate = useNavigate();
  const { currentUser, users } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [components, setComponents] = useState<Component[]>([]);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [isSavingGeneral, setIsSavingGeneral] = useState(false);
  const [generalSuccess, setGeneralSuccess] = useState(false);

  // Component form state
  const [newCompId, setNewCompId] = useState('');
  const [newCompName, setNewCompName] = useState('');
  const [newCompDesc, setNewCompDesc] = useState('');
  const [isAddingComp, setIsAddingComp] = useState(false);

  // Member form state
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('developer');
  const [isAddingMember, setIsAddingMember] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchProjectByKey(key, currentUser?.id);
      setProject(res.project);
      setComponents(res.components);
      setMembers(res.members);
      setName(res.project.name);
      setDescription(res.project.description || '');
      setRepoUrl(res.project.repo_url || '');
    } catch (err: any) {
      console.error('Failed to load project settings:', err);
      setError(err.message || 'Failed to load project');
    } finally {
      setIsLoading(false);
    }
  }, [key, currentUser?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const isProjectAdmin = project?.user_role === 'admin' || currentUser?.role === 'admin';

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingGeneral(true);
    setGeneralSuccess(false);
    setError(null);
    try {
      const updated = await updateProject(key, {
        name: name.trim(),
        description: description.trim() || undefined,
        repo_url: repoUrl.trim() || undefined
      }, currentUser?.id);
      setProject(updated);
      setGeneralSuccess(true);
      setTimeout(() => setGeneralSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update project settings');
    } finally {
      setIsSavingGeneral(false);
    }
  };

  const handleAddComponent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompId.trim() || !newCompName.trim()) return;
    setIsAddingComp(true);
    setError(null);
    try {
      await addProjectComponent(key, {
        id: newCompId.trim().toLowerCase(),
        name: newCompName.trim(),
        description: newCompDesc.trim() || undefined
      }, currentUser?.id);
      setNewCompId('');
      setNewCompName('');
      setNewCompDesc('');
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to add component');
    } finally {
      setIsAddingComp(false);
    }
  };

  const handleUpdateMemberRole = async (userId: string, member_role: UserRole) => {
    try {
      await updateProjectMember(key, { user_id: userId, member_role }, currentUser?.id);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to update member role');
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) return;
    setIsAddingMember(true);
    setError(null);
    try {
      await updateProjectMember(key, { user_id: selectedUserId, member_role: selectedRole }, currentUser?.id);
      setSelectedUserId('');
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to add project member');
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    try {
      await removeProjectMember(key, userId, currentUser?.id);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to remove member');
    }
  };

  if (isLoading) {
    return (
      <main id="main-content" className="space-y-6 font-mono p-6">
        <div className="p-16 flex flex-col items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin text-foreground" />
          <p className="text-xs uppercase">Loading project settings...</p>
        </div>
      </main>
    );
  }

  if (!isProjectAdmin) {
    return (
      <main id="main-content" className="space-y-6 font-mono p-6">
        <div className="p-12 text-center border border-border bg-[#0d0d0d] rounded-sm space-y-3">
          <Shield className="w-8 h-8 text-amber-400 mx-auto" />
          <h1 className="text-sm font-bold uppercase text-foreground">Access Restricted</h1>
          <p className="text-xs text-muted-foreground uppercase max-w-md mx-auto">
            You require Project Admin or Global Admin privileges to modify settings for the {key.toUpperCase()} workspace.
          </p>
          <Link
            to={`/projects/${key}`}
            className="px-4 py-2 bg-foreground text-background font-bold text-xs uppercase inline-block rounded-sm mt-2"
          >
            RETURN TO ISSUES
          </Link>
        </div>
      </main>
    );
  }

  // Find users not yet in this project
  const existingMemberUserIds = new Set(members.map((m) => m.user_id));
  const availableUsersToAdd = users.filter((u) => !existingMemberUserIds.has(u.id));

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
              <span className="px-1.5 py-0.2 text-[9px] font-bold uppercase border border-purple-600 bg-purple-950 text-purple-300 rounded-xs">
                ADMIN CONSOLE
              </span>
            </div>

            <h1 className="text-xl font-black text-foreground uppercase tracking-tight">
              {project?.name || `${key.toUpperCase()} WORKSPACE`} SETTINGS
            </h1>
            <p className="text-xs text-muted-foreground uppercase">
              Configure project identity, connected repositories, subsystems, and role assignments.
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
            className="py-3 px-4 font-bold border-b-2 border-transparent text-muted-foreground hover:text-foreground hover:border-border flex items-center gap-2 uppercase transition-all"
          >
            <TrendingUp className="w-4 h-4" />
            <span>FLOW ANALYTICS</span>
          </Link>

          <Link
            to={`/projects/${key}/settings`}
            className="py-3 px-4 font-bold border-b-2 border-foreground text-foreground flex items-center gap-2 uppercase ml-auto"
          >
            <Settings className="w-4 h-4 text-[#B497CF]" />
            <span>SETTINGS</span>
          </Link>
        </nav>
      </div>

      {error && (
        <div role="alert" className="p-4 bg-red-950/40 border border-red-500 text-red-300 text-xs rounded-sm uppercase flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Section 1: General Project Identity */}
      <section aria-labelledby="general-settings-title" className="bg-[#0d0d0d] border border-border rounded-sm p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-[#B497CF]" />
            <h2 id="general-settings-title" className="text-xs font-bold text-foreground uppercase tracking-wider">
              GENERAL PROJECT ATTRIBUTES
            </h2>
          </div>
          {generalSuccess && (
            <span className="text-[11px] text-emerald-400 font-bold uppercase flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>SAVED SUCCESSFULLY</span>
            </span>
          )}
        </div>

        <form onSubmit={handleSaveGeneral} className="space-y-4 max-w-2xl">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="settings-key" className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">
                PROJECT KEY (IMMUTABLE)
              </label>
              <input
                id="settings-key"
                type="text"
                disabled
                value={key.toUpperCase()}
                className="w-full px-3 py-2 bg-[#080808] border border-border text-muted-foreground text-xs uppercase font-bold rounded-sm cursor-not-allowed"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="settings-name" className="block text-[10px] font-bold text-foreground uppercase mb-1">
                PROJECT DISPLAY NAME *
              </label>
              <input
                id="settings-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-[#080808] border border-border focus:border-foreground text-foreground text-xs rounded-sm outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="settings-desc" className="block text-[10px] font-bold text-foreground uppercase mb-1">
              PROJECT SCOPE & MISSION DESCRIPTION
            </label>
            <textarea
              id="settings-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-[#080808] border border-border focus:border-foreground text-foreground text-xs rounded-sm outline-none resize-none"
            />
          </div>

          <div>
            <label htmlFor="settings-repo" className="block text-[10px] font-bold text-foreground uppercase mb-1">
              CONNECTED GITHUB REPOSITORY URL
            </label>
            <input
              id="settings-repo"
              type="url"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/org/repo"
              className="w-full px-3 py-2 bg-[#080808] border border-border focus:border-foreground text-foreground text-xs rounded-sm outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={isSavingGeneral}
            className="px-4 py-2 bg-foreground text-background font-bold text-xs uppercase flex items-center gap-2 hover:bg-white rounded-sm transition-all disabled:opacity-50"
          >
            {isSavingGeneral ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>SAVE GENERAL SETTINGS</span>
          </button>
        </form>
      </section>

      {/* Section 2: Subsystems / Components */}
      <section aria-labelledby="components-title" className="bg-[#0d0d0d] border border-border rounded-sm p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-foreground" />
            <h2 id="components-title" className="text-xs font-bold text-foreground uppercase tracking-wider">
              PROJECT SUBSYSTEMS & COMPONENTS ({components.length})
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* List of existing components */}
          <div className="lg:col-span-7 space-y-2">
            {components.length === 0 ? (
              <p className="text-xs text-muted-foreground uppercase p-4 border border-dashed border-border rounded-sm">
                No custom components configured for this project.
              </p>
            ) : (
              components.map((comp) => (
                <div
                  key={comp.id}
                  className="p-3 bg-[#080808] border border-border rounded-sm flex items-center justify-between"
                >
                  <div>
                    <span className="text-xs font-bold text-foreground uppercase block">{comp.name}</span>
                    <span className="text-[10px] text-muted-foreground uppercase font-mono">
                      ID: {comp.id} {comp.description && `• ${comp.description}`}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 text-[9px] bg-black text-muted-foreground border border-border uppercase rounded-xs">
                    ACTIVE
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Add Component Form */}
          <form onSubmit={handleAddComponent} className="lg:col-span-5 bg-[#080808] p-4 border border-border rounded-sm space-y-3">
            <span className="text-[10px] font-bold text-foreground uppercase block">ADD NEW COMPONENT</span>
            <div>
              <label htmlFor="comp-id" className="block text-[9px] font-bold text-muted-foreground uppercase mb-1">
                COMPONENT ID (SLUG) *
              </label>
              <input
                id="comp-id"
                type="text"
                required
                placeholder="webhook-engine"
                value={newCompId}
                onChange={(e) => setNewCompId(e.target.value.toLowerCase())}
                className="w-full px-2.5 py-1.5 bg-[#0d0d0d] border border-border text-foreground text-xs rounded-sm outline-none"
              />
            </div>

            <div>
              <label htmlFor="comp-name" className="block text-[9px] font-bold text-muted-foreground uppercase mb-1">
                COMPONENT NAME *
              </label>
              <input
                id="comp-name"
                type="text"
                required
                placeholder="Webhook & Ingestion Pipeline"
                value={newCompName}
                onChange={(e) => setNewCompName(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-[#0d0d0d] border border-border text-foreground text-xs rounded-sm outline-none"
              />
            </div>

            <div>
              <label htmlFor="comp-desc" className="block text-[9px] font-bold text-muted-foreground uppercase mb-1">
                DESCRIPTION (OPTIONAL)
              </label>
              <input
                id="comp-desc"
                type="text"
                placeholder="Delivery retries, backoff, and signature verification"
                value={newCompDesc}
                onChange={(e) => setNewCompDesc(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-[#0d0d0d] border border-border text-foreground text-xs rounded-sm outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isAddingComp}
              className="w-full py-2 bg-foreground text-background font-bold text-xs uppercase flex items-center justify-center gap-1.5 hover:bg-white rounded-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>REGISTER COMPONENT</span>
            </button>
          </form>
        </div>
      </section>

      {/* Section 3: Project Team & Roles */}
      <section aria-labelledby="members-title" className="bg-[#0d0d0d] border border-border rounded-sm p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-foreground" />
            <h2 id="members-title" className="text-xs font-bold text-foreground uppercase tracking-wider">
              PROJECT TEAM & ACCESS MATRIX ({members.length})
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Members Table */}
          <div className="lg:col-span-8 space-y-2">
            {members.map((member) => (
              <div
                key={member.user_id}
                className="p-3 bg-[#080808] border border-border rounded-sm flex items-center justify-between gap-3 flex-wrap"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 bg-foreground text-background rounded-full flex items-center justify-center text-xs font-bold uppercase">
                    {member.user?.name?.[0] || 'U'}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-foreground uppercase block">
                      {member.user?.name || member.user_id}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      @{member.user?.username || member.user_id} • {member.user?.email || ''}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={member.role}
                    onChange={(e) => handleUpdateMemberRole(member.user_id, e.target.value as UserRole)}
                    className="bg-black border border-border text-foreground text-xs px-2 py-1 uppercase rounded-xs font-bold"
                  >
                    <option value="reporter">REPORTER</option>
                    <option value="developer">DEVELOPER</option>
                    <option value="triager">TRIAGER</option>
                    <option value="admin">ADMIN</option>
                  </select>

                  <button
                    onClick={() => handleRemoveMember(member.user_id)}
                    className="p-1.5 text-muted-foreground hover:text-red-400 transition-colors"
                    title="Remove member from project"
                    aria-label={`Remove ${member.user?.name || member.user_id} from project`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Add Member Form */}
          <form onSubmit={handleAddMember} className="lg:col-span-4 bg-[#080808] p-4 border border-border rounded-sm space-y-3">
            <span className="text-[10px] font-bold text-foreground uppercase block">ENROLL NEW MEMBER</span>

            <div>
              <label htmlFor="select-user" className="block text-[9px] font-bold text-muted-foreground uppercase mb-1">
                SELECT USER *
              </label>
              <select
                id="select-user"
                required
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-[#0d0d0d] border border-border text-foreground text-xs rounded-sm outline-none"
              >
                <option value="">CHOOSE USER...</option>
                {availableUsersToAdd.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} (@{u.username})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="select-role" className="block text-[9px] font-bold text-muted-foreground uppercase mb-1">
                PROJECT ROLE *
              </label>
              <select
                id="select-role"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                className="w-full px-2.5 py-1.5 bg-[#0d0d0d] border border-border text-foreground text-xs rounded-sm outline-none font-bold uppercase"
              >
                <option value="reporter">REPORTER</option>
                <option value="developer">DEVELOPER</option>
                <option value="triager">TRIAGER</option>
                <option value="admin">ADMIN</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isAddingMember || !selectedUserId}
              className="w-full py-2 bg-foreground text-background font-bold text-xs uppercase flex items-center justify-center gap-1.5 hover:bg-white rounded-sm disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>GRANT PROJECT ACCESS</span>
            </button>
          </form>
        </div>
      </section>
    </main>
  );
};

import React, { useState, useEffect } from 'react';
import {
  Users,
  Layers,
  Milestone,
  Flag,
  GitBranch,
  Shield,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  AlertCircle,
  Sparkles,
  ExternalLink,
  Code2,
  Save,
  CheckCircle2,
  RefreshCw,
  Lock,
  Radio,
  Key
} from 'lucide-react';
import {
  fetchAdminUsers,
  updateAdminUser,
  createAdminUser,
  fetchAdminComponents,
  createAdminComponent,
  deleteAdminComponent,
  fetchAdminMilestones,
  createAdminMilestone,
  deleteAdminMilestone,
  fetchAdminVersions,
  createAdminVersion,
  deleteAdminVersion,
  fetchAdminFlagTypes,
  saveAdminFlagType,
  fetchAdminWorkflow
} from '../../services/api.ts';
import { User, UserRole } from '@triarc/shared-types';
import { WorkflowGraph } from '../Analytics/WorkflowGraph.tsx';
import { AnimatedCounter } from '../Cyber/AnimatedCounter.tsx';

export const AdminPanelView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'components' | 'milestones' | 'flags' | 'workflow'>('users');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Data states
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [components, setComponents] = useState<any[]>([]);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [versions, setVersions] = useState<any[]>([]);
  const [flagTypes, setFlagTypes] = useState<any[]>([]);
  const [workflow, setWorkflow] = useState<any>(null);

  // Creation form states
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserData, setNewUserData] = useState({ username: '', name: '', email: '', role: 'developer' as UserRole, password: 'password123', isSecGroup: false });

  const [newCompData, setNewCompData] = useState({ id: '', name: '', description: '' });
  const [newMilestoneData, setNewMilestoneData] = useState({ name: '', due_date: '' });
  const [newVersionData, setNewVersionData] = useState({ name: '' });

  const showNotification = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 3500);
  };

  const loadAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [uData, cData, mData, vData, fData, wData] = await Promise.all([
        fetchAdminUsers(),
        fetchAdminComponents(),
        fetchAdminMilestones(),
        fetchAdminVersions(),
        fetchAdminFlagTypes(),
        fetchAdminWorkflow()
      ]);
      setUsers(uData.users || []);
      setGroups(uData.groups || []);
      setComponents(cData.components || []);
      setMilestones(mData.milestones || []);
      setVersions(vData.versions || []);
      setFlagTypes(fData.flag_types || []);
      setWorkflow(wData.workflow || null);
    } catch (err: any) {
      setError(err.message || 'Failed to load administrative configuration');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Handlers for User Management
  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await updateAdminUser(userId, { role: newRole as UserRole });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole as UserRole } : u));
      showNotification(`Role updated to ${newRole.toUpperCase()} for operator`);
    } catch (err: any) {
      setError(err.message || 'Failed to update operator role');
    }
  };

  const handleToggleSecurityGroup = async (user: User) => {
    const isCurrentlySec = (user.security_group_ids || []).includes('grp_sec');
    const newGroups = isCurrentlySec
      ? (user.security_group_ids || []).filter(g => g !== 'grp_sec')
      : [...(user.security_group_ids || []), 'grp_sec'];

    try {
      await updateAdminUser(user.id, { security_group_ids: newGroups });
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, security_group_ids: newGroups } : u));
      showNotification(`Classified group membership updated for @${user.username}`);
    } catch (err: any) {
      setError(err.message || 'Failed to update security clearance');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await createAdminUser({
        username: newUserData.username,
        name: newUserData.name,
        email: newUserData.email,
        role: newUserData.role,
        password: newUserData.password,
        security_group_ids: newUserData.isSecGroup ? ['grp_sec'] : []
      });
      setUsers(prev => [...prev, res.user]);
      setShowAddUserModal(false);
      setNewUserData({ username: '', name: '', email: '', role: 'developer', password: 'password123', isSecGroup: false });
      showNotification(`Operator @${res.user.username} provisioned successfully`);
    } catch (err: any) {
      setError(err.message || 'Failed to provision operator');
    }
  };

  // Handlers for Components
  const handleCreateComponent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompData.id || !newCompData.name) return;
    try {
      const res = await createAdminComponent(newCompData);
      setComponents(prev => [...prev, res.component]);
      setNewCompData({ id: '', name: '', description: '' });
      showNotification(`Component "${res.component.name}" added`);
    } catch (err: any) {
      setError(err.message || 'Failed to add component');
    }
  };

  const handleDeleteComponent = async (compId: string) => {
    if (!confirm(`Delete component "${compId}"?`)) return;
    try {
      await deleteAdminComponent(compId);
      setComponents(prev => prev.filter(c => c.id !== compId));
      showNotification(`Component deleted`);
    } catch (err: any) {
      setError(err.message || 'Failed to delete component');
    }
  };

  // Handlers for Milestones & Versions
  const handleCreateMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMilestoneData.name) return;
    try {
      const res = await createAdminMilestone(newMilestoneData);
      setMilestones(prev => [...prev, res.milestone]);
      setNewMilestoneData({ name: '', due_date: '' });
      showNotification(`Milestone "${res.milestone.name}" added`);
    } catch (err: any) {
      setError(err.message || 'Failed to add milestone');
    }
  };

  const handleDeleteMilestone = async (msId: string) => {
    try {
      await deleteAdminMilestone(msId);
      setMilestones(prev => prev.filter(m => m.id !== msId));
      showNotification(`Milestone removed`);
    } catch (err: any) {
      setError(err.message || 'Failed to delete milestone');
    }
  };

  const handleCreateVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVersionData.name) return;
    try {
      const res = await createAdminVersion(newVersionData);
      setVersions(prev => [...prev, res.version]);
      setNewVersionData({ name: '' });
      showNotification(`Version "${res.version.name}" added`);
    } catch (err: any) {
      setError(err.message || 'Failed to add version');
    }
  };

  const handleDeleteVersion = async (verId: string) => {
    try {
      await deleteAdminVersion(verId);
      setVersions(prev => prev.filter(v => v.id !== verId));
      showNotification(`Version removed`);
    } catch (err: any) {
      setError(err.message || 'Failed to delete version');
    }
  };

  return (
    <div className="space-y-6">
      {/* Section Taxonomy */}
      <div className="flex items-center gap-4">
        <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-mono">
          // SECTION: ADMIN_GOVERNANCE
        </span>
        <div className="flex-1 border-t border-border"></div>
        <span className="inline-block h-2 w-2 bg-[#B497CF] animate-blink"></span>
        <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-mono">
          004
        </span>
      </div>

      {/* Header HUD */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-[#0d0d0d] border-2 border-foreground shadow-brutalist">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-foreground text-background flex items-center justify-center font-mono font-bold">
            <Key className="w-4 h-4 text-background" />
          </div>
          <div>
            <h1 className="text-base font-bold font-mono text-foreground uppercase tracking-wider flex items-center gap-2">
              <span>// ADMINISTRATION & SECURITY GOVERNANCE</span>
              <span className="text-[9px] bg-[#B497CF] text-background px-1.5 py-0.2 font-mono font-bold">
                CLEARANCE: LEVEL 5
              </span>
            </h1>
            <p className="text-xs font-mono text-muted-foreground uppercase">
              MANAGE OPERATORS, RBAC CLEARANCES, SUBSYSTEMS & FINITE STATE MACHINES.
            </p>
          </div>
        </div>

        <button
          onClick={loadAllData}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#080808] hover:bg-foreground hover:text-background border-2 border-border text-foreground font-mono text-xs font-bold uppercase transition-all self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>REFRESH CONFIG</span>
        </button>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-3 bg-emerald-950 border-2 border-emerald-500 flex items-center gap-2 text-emerald-200 text-xs font-mono uppercase">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-950 border-2 border-red-500 flex items-center gap-2 text-red-200 text-xs font-mono uppercase">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b-2 border-border gap-1 overflow-x-auto pb-px font-mono text-xs">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-1.5 px-3 py-1.5 uppercase font-bold border transition-all whitespace-nowrap ${activeTab === 'users'
              ? 'bg-foreground text-background border-foreground'
              : 'text-muted-foreground hover:text-foreground border-transparent'
            }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>OPERATORS & RBAC (<AnimatedCounter value={users.length} />)</span>
        </button>

        <button
          onClick={() => setActiveTab('components')}
          className={`flex items-center gap-1.5 px-3 py-1.5 uppercase font-bold border transition-all whitespace-nowrap ${activeTab === 'components'
              ? 'bg-foreground text-background border-foreground'
              : 'text-muted-foreground hover:text-foreground border-transparent'
            }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>SUBSYSTEMS ({components.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('milestones')}
          className={`flex items-center gap-1.5 px-3 py-1.5 uppercase font-bold border transition-all whitespace-nowrap ${activeTab === 'milestones'
              ? 'bg-foreground text-background border-foreground'
              : 'text-muted-foreground hover:text-foreground border-transparent'
            }`}
        >
          <Milestone className="w-3.5 h-3.5" />
          <span>MILESTONES & VERSIONS</span>
        </button>

        <button
          onClick={() => setActiveTab('flags')}
          className={`flex items-center gap-1.5 px-3 py-1.5 uppercase font-bold border transition-all whitespace-nowrap ${activeTab === 'flags'
              ? 'bg-foreground text-background border-foreground'
              : 'text-muted-foreground hover:text-foreground border-transparent'
            }`}
        >
          <Flag className="w-3.5 h-3.5" />
          <span>FLAG AUTHORITY ({flagTypes.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('workflow')}
          className={`flex items-center gap-1.5 px-3 py-1.5 uppercase font-bold border transition-all whitespace-nowrap ${activeTab === 'workflow'
              ? 'bg-foreground text-background border-foreground'
              : 'text-muted-foreground hover:text-foreground border-transparent'
            }`}
        >
          <GitBranch className="w-3.5 h-3.5" />
          <span>STATE MACHINE ENGINE</span>
        </button>
      </div>

      {/* Tab 1: Users & RBAC */}
      {activeTab === 'users' && (
        <div className="space-y-3 font-mono">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground uppercase">
              // CONFIGURE OPERATOR ROLES, SECURITY GROUP MEMBERSHIPS, AND RBAC CLEARANCES.
            </p>
            <button
              onClick={() => setShowAddUserModal(true)}
              className="brutalist-btn"
            >
              <span className="btn-icon-block"><Plus className="w-3.5 h-3.5 stroke-[3]" /></span>
              <span className="btn-text-block">PROVISION OPERATOR</span>
            </button>
          </div>

          <div className="bg-[#0d0d0d] border-2 border-foreground overflow-hidden shadow-brutalist">
            <table className="w-full text-left text-xs text-foreground">
              <thead className="bg-[#121212] text-[10px] uppercase font-bold tracking-widest text-muted-foreground border-b-2 border-border">
                <tr>
                  <th className="py-2.5 px-3">// OPERATOR</th>
                  <th className="py-2.5 px-3">// ORIGIN</th>
                  <th className="py-2.5 px-3">// RBAC ROLE</th>
                  <th className="py-2.5 px-3">// CLASSIFIED CLEARANCE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((u) => {
                  const isSec = (u.security_group_ids || []).includes('grp_sec');
                  return (
                    <tr key={u.id} className="hover:bg-[#141414] transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <img
                            src={u.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                            alt={u.name}
                            className="w-6 h-6 border border-border object-cover"
                          />
                          <div>
                            <div className="font-bold text-foreground text-xs uppercase">{u.name}</div>
                            <div className="text-[10px] text-muted-foreground font-mono">@{u.username} · {u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        {u.is_external ? (
                          <span className="px-1.5 py-0.2 border border-border text-muted-foreground text-[10px] uppercase">
                            GITHUB EXTERNAL
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.2 bg-foreground text-background text-[10px] font-bold uppercase">
                            INTERNAL OPERATOR
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          disabled={u.is_external}
                          className="bg-[#080808] border border-border px-2 py-1 text-xs text-foreground uppercase focus:outline-none focus:border-foreground font-mono disabled:opacity-50"
                        >
                          <option value="admin">ADMIN // L5</option>
                          <option value="triager">TRIAGER // L3</option>
                          <option value="developer">DEVELOPER // L2</option>
                          <option value="security">SECURITY // L4</option>
                          <option value="reporter">REPORTER // L1</option>
                        </select>
                      </td>
                      <td className="py-2.5 px-3">
                        <button
                          onClick={() => handleToggleSecurityGroup(u)}
                          disabled={u.is_external}
                          className={`px-2 py-0.5 text-xs font-mono uppercase font-bold border transition-all ${isSec
                              ? 'bg-purple-950 text-purple-300 border-purple-500'
                              : 'bg-black text-muted-foreground border-border hover:border-foreground hover:text-foreground'
                            } disabled:opacity-40`}
                        >
                          <span>{isSec ? '[CLASSIFIED ACTIVE]' : 'STANDARD ACCESS'}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Components & Subsystems */}
      {activeTab === 'components' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 font-mono">
          <div className="lg:col-span-2 space-y-2">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">// SUBSYSTEM VECTORS</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {components.map((c) => (
                <div key={c.id} className="p-3 bg-[#0d0d0d] border-2 border-border flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground text-xs uppercase">{c.name}</span>
                      <code className="text-[9px] bg-black text-[#B497CF] px-1 py-0.2 border border-border uppercase">
                        {c.id}
                      </code>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1 uppercase font-mono">{c.description || '// NO DESCRIPTION'}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteComponent(c.id)}
                    className="p-1 text-muted-foreground hover:text-red-400 border border-border hover:border-red-500 bg-black"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 bg-[#0d0d0d] border-2 border-foreground space-y-3">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-widest">// ADD SUBSYSTEM VECTOR</h3>
            <form onSubmit={handleCreateComponent} className="space-y-2.5">
              <div>
                <label className="block text-[9px] uppercase font-bold text-muted-foreground mb-1">COMPONENT ID</label>
                <input
                  type="text"
                  value={newCompData.id}
                  onChange={(e) => setNewCompData({ ...newCompData, id: e.target.value })}
                  placeholder="e.g. telemetry, crypto, auth"
                  className="w-full bg-black border-2 border-border p-1.5 text-xs text-foreground focus:outline-none focus:border-foreground uppercase font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-[9px] uppercase font-bold text-muted-foreground mb-1">DISPLAY NAME</label>
                <input
                  type="text"
                  value={newCompData.name}
                  onChange={(e) => setNewCompData({ ...newCompData, name: e.target.value })}
                  placeholder="e.g. Telemetry Ingestion Engine"
                  className="w-full bg-black border-2 border-border p-1.5 text-xs text-foreground focus:outline-none focus:border-foreground uppercase font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-[9px] uppercase font-bold text-muted-foreground mb-1">DESCRIPTION</label>
                <textarea
                  value={newCompData.description}
                  onChange={(e) => setNewCompData({ ...newCompData, description: e.target.value })}
                  placeholder="VECTOR RESPONSIBILITIES..."
                  rows={2}
                  className="w-full bg-black border-2 border-border p-1.5 text-xs text-foreground focus:outline-none focus:border-foreground uppercase font-mono"
                />
              </div>
              <button
                type="submit"
                className="w-full px-3 py-2 bg-foreground text-background font-bold text-xs uppercase hover:bg-white flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>SAVE SUBSYSTEM VECTOR</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Tab 3: Milestones & Versions */}
      {activeTab === 'milestones' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 font-mono">
          {/* Milestones */}
          <div className="p-4 bg-[#0d0d0d] border-2 border-border space-y-3">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-widest flex items-center justify-between">
              <span>// TARGET RELEASE MILESTONES</span>
              <span className="text-[9px] text-muted-foreground">{milestones.length} ACTIVE</span>
            </h3>

            <div className="space-y-1.5">
              {milestones.map((m) => (
                <div key={m.id} className="flex items-center justify-between p-2 bg-black border border-border">
                  <div className="flex items-center gap-2">
                    <Milestone className="w-3.5 h-3.5 text-[#B497CF]" />
                    <span className="font-bold text-foreground text-xs uppercase">{m.name}</span>
                    {m.due_date && (
                      <span className="text-[9px] text-muted-foreground uppercase border border-border px-1 py-0.2">
                        DUE: {m.due_date}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteMilestone(m.id)}
                    className="p-1 text-muted-foreground hover:text-red-400 border border-border hover:border-red-500 bg-[#0d0d0d]"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>

            <form onSubmit={handleCreateMilestone} className="pt-2 border-t border-border flex gap-2">
              <input
                type="text"
                value={newMilestoneData.name}
                onChange={(e) => setNewMilestoneData({ ...newMilestoneData, name: e.target.value })}
                placeholder="MILESTONE NAME..."
                className="flex-1 bg-black border-2 border-border p-1.5 text-xs text-foreground focus:outline-none focus:border-foreground uppercase font-mono"
                required
              />
              <input
                type="date"
                value={newMilestoneData.due_date}
                onChange={(e) => setNewMilestoneData({ ...newMilestoneData, due_date: e.target.value })}
                className="bg-black border-2 border-border p-1.5 text-xs text-foreground focus:outline-none focus:border-foreground font-mono uppercase"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-foreground text-background font-bold text-xs uppercase hover:bg-white"
              >
                ADD
              </button>
            </form>
          </div>

          {/* Software Versions */}
          <div className="p-4 bg-[#0d0d0d] border-2 border-border space-y-3">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-widest flex items-center justify-between">
              <span>// SOFTWARE BUILD VERSIONS</span>
              <span className="text-[9px] text-muted-foreground">{versions.length} ACTIVE</span>
            </h3>

            <div className="space-y-1.5">
              {versions.map((v) => (
                <div key={v.id} className="flex items-center justify-between p-2 bg-black border border-border">
                  <span className="font-bold text-foreground text-xs font-mono uppercase">v{v.name}</span>
                  <button
                    onClick={() => handleDeleteVersion(v.id)}
                    className="p-1 text-muted-foreground hover:text-red-400 border border-border hover:border-red-500 bg-[#0d0d0d]"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>

            <form onSubmit={handleCreateVersion} className="pt-2 border-t border-border flex gap-2">
              <input
                type="text"
                value={newVersionData.name}
                onChange={(e) => setNewVersionData({ name: e.target.value })}
                placeholder="VERSION TAG (e.g. 2.1.2)..."
                className="flex-1 bg-black border-2 border-border p-1.5 text-xs text-foreground focus:outline-none focus:border-foreground uppercase font-mono"
                required
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-foreground text-background font-bold text-xs uppercase hover:bg-white"
              >
                ADD
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Tab 4: Flag Authority */}
      {activeTab === 'flags' && (
        <div className="bg-[#0d0d0d] border-2 border-border p-4 space-y-3 font-mono">
          <div>
            <h3 className="text-xs font-bold text-foreground uppercase tracking-widest">// CLEARANCE FLAG AUTHORITY TYPES</h3>
            <p className="text-[10px] text-muted-foreground mt-0.5 uppercase">
              CONFIGURE CLEARANCE REQUIREMENTS FOR REQUESTING REVIEW FLAGS AND PERMISSIONED GRANT AUTHORITY.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            {flagTypes.map((ft) => (
              <div key={ft.id} className="p-3 bg-black border-2 border-border space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Flag className="w-3.5 h-3.5 text-[#B497CF]" />
                    <span className="font-bold text-foreground text-xs uppercase">{ft.name}</span>
                  </div>
                  <code className="text-[9px] text-[#B497CF] bg-[#141414] px-1.5 py-0.2 border border-border uppercase">{ft.id}</code>
                </div>

                <div className="text-[10px] space-y-1 text-muted-foreground uppercase">
                  <div className="flex justify-between">
                    <span>REQUEST ROLE:</span>
                    <span className="font-bold text-foreground">{ft.request_role}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>GRANT ROLE (+/-):</span>
                    <span className="font-bold text-[#B497CF]">{ft.grant_role}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>TARGET:</span>
                    <span className="text-foreground">{ft.target}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 5: State Machine Workflow Graph */}
      {activeTab === 'workflow' && (
        <div className="space-y-6">
          {workflow && (
            <WorkflowGraph workflow={workflow} />
          )}
        </div>
      )}

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#080808] border-2 border-foreground p-5 space-y-3 shadow-brutalist font-mono">
            <div className="flex items-center justify-between border-b-2 border-border pb-2">
              <h3 className="text-xs font-bold font-mono text-foreground uppercase tracking-wider">// PROVISION OPERATOR ACCOUNT</h3>
              <button onClick={() => setShowAddUserModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-2.5 font-mono text-xs">
              <div>
                <label className="block text-[9px] uppercase font-bold text-muted-foreground mb-1">USERNAME</label>
                <input
                  type="text"
                  value={newUserData.username}
                  onChange={(e) => setNewUserData({ ...newUserData, username: e.target.value })}
                  placeholder="e.g. m_vance"
                  className="w-full bg-[#0d0d0d] border-2 border-border p-1.5 text-xs text-foreground focus:outline-none focus:border-foreground uppercase"
                  required
                />
              </div>

              <div>
                <label className="block text-[9px] uppercase font-bold text-muted-foreground mb-1">FULL NAME</label>
                <input
                  type="text"
                  value={newUserData.name}
                  onChange={(e) => setNewUserData({ ...newUserData, name: e.target.value })}
                  placeholder="e.g. Marcus Vance"
                  className="w-full bg-[#0d0d0d] border-2 border-border p-1.5 text-xs text-foreground focus:outline-none focus:border-foreground uppercase"
                  required
                />
              </div>

              <div>
                <label className="block text-[9px] uppercase font-bold text-muted-foreground mb-1">EMAIL ADDRESS</label>
                <input
                  type="email"
                  value={newUserData.email}
                  onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                  placeholder="mvance@triarc.sec"
                  className="w-full bg-[#0d0d0d] border-2 border-border p-1.5 text-xs text-foreground focus:outline-none focus:border-foreground uppercase"
                  required
                />
              </div>

              <div>
                <label className="block text-[9px] uppercase font-bold text-muted-foreground mb-1">SYSTEM ROLE (RBAC)</label>
                <select
                  value={newUserData.role}
                  onChange={(e) => setNewUserData({ ...newUserData, role: e.target.value as UserRole })}
                  className="w-full bg-[#0d0d0d] border-2 border-border p-1.5 text-xs text-foreground focus:outline-none focus:border-foreground uppercase"
                >
                  <option value="developer">DEVELOPER</option>
                  <option value="triager">TRIAGER</option>
                  <option value="admin">ADMIN</option>
                  <option value="security">SECURITY</option>
                  <option value="reporter">REPORTER</option>
                </select>
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer uppercase">
                  <input
                    type="checkbox"
                    checked={newUserData.isSecGroup}
                    onChange={(e) => setNewUserData({ ...newUserData, isSecGroup: e.target.checked })}
                    className="rounded-none bg-black border-border text-foreground focus:ring-0"
                  />
                  <span>GRANT CLEARANCE TO grp_sec</span>
                </label>
              </div>

              <div className="pt-3 flex gap-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="flex-1 py-1.5 border-2 border-border text-muted-foreground hover:text-foreground text-xs uppercase font-bold"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="flex-1 px-3 py-1.5 bg-foreground text-background font-bold text-xs uppercase hover:bg-white"
                >
                  PROVISION
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

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

  // Handlers for Users
  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const updated = await updateAdminUser(userId, { role: newRole });
      setUsers(prev => prev.map(u => u.id === userId ? updated.user : u));
      showNotification(`Updated role for ${updated.user.name} to ${newRole.toUpperCase()}`);
    } catch (err: any) {
      setError(err.message || 'Failed to update user role');
    }
  };

  const handleToggleSecurityGroup = async (user: User) => {
    const isCurrentlyInSec = (user.security_group_ids || []).includes('grp_sec');
    const newGroups = isCurrentlyInSec
      ? (user.security_group_ids || []).filter(g => g !== 'grp_sec')
      : [...(user.security_group_ids || []), 'grp_sec'];

    try {
      const updated = await updateAdminUser(user.id, { security_group_ids: newGroups });
      setUsers(prev => prev.map(u => u.id === user.id ? updated.user : u));
      showNotification(isCurrentlyInSec ? `Removed ${user.name} from Security Core Team` : `Added ${user.name} to Security Core Team`);
    } catch (err: any) {
      setError(err.message || 'Failed to update user security groups');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserData.username || !newUserData.name || !newUserData.email) return;

    try {
      const res = await createAdminUser({
        username: newUserData.username,
        name: newUserData.name,
        email: newUserData.email,
        role: newUserData.role,
        password: newUserData.password,
        security_group_ids: newUserData.isSecGroup ? ['grp_sec'] : []
      });
      setUsers(prev => [res.user, ...prev]);
      setShowAddUserModal(false);
      setNewUserData({ username: '', name: '', email: '', role: 'developer', password: 'password123', isSecGroup: false });
      showNotification(`User ${res.user.name} created successfully!`);
    } catch (err: any) {
      setError(err.message || 'Failed to create user');
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
    if (!confirm(`Are you sure you want to delete component "${compId}"?`)) return;
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
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header HUD */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-950/90 border border-cyan-500/20 shadow-cyber-card backdrop-blur-xl cyber-corners">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-purple-950/80 border border-purple-500/40 rounded-2xl text-purple-400 shadow-glow-purple">
            <Key className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-mono text-white tracking-tight flex items-center gap-2.5">
              <span>ADMINISTRATION & SECURITY GOVERNANCE</span>
              <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/40 px-2 py-0.5 rounded-full font-mono font-bold shadow-glow-purple">
                CLEARANCE: LEVEL 5
              </span>
            </h1>
            <p className="text-xs font-mono text-slate-400">
              Manage organization operators, cryptographic role permissions, subsystems, and state machine workflows.
            </p>
          </div>
        </div>

        <button
          onClick={loadAllData}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-cyan-300 rounded-xl border border-slate-700 font-mono text-xs font-semibold shadow-sm transition-all self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Config</span>
        </button>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-3.5 bg-emerald-950/80 border border-emerald-500/50 rounded-xl flex items-center gap-3 text-emerald-200 text-xs font-mono animate-fade-in shadow-glow-neon">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 bg-red-950/80 border border-red-500/50 rounded-xl flex items-center gap-3 text-red-200 text-xs font-mono shadow-glow-red">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-800 gap-2 overflow-x-auto pb-px font-mono text-xs">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-2.5 font-bold border-b-2 transition-all whitespace-nowrap rounded-t-xl ${
            activeTab === 'users'
              ? 'border-cyan-400 text-cyan-300 bg-cyan-500/10 shadow-glow-cyan'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Operators & RBAC (<AnimatedCounter value={users.length} />)</span>
        </button>

        <button
          onClick={() => setActiveTab('components')}
          className={`flex items-center gap-2 px-4 py-2.5 font-bold border-b-2 transition-all whitespace-nowrap rounded-t-xl ${
            activeTab === 'components'
              ? 'border-cyan-400 text-cyan-300 bg-cyan-500/10 shadow-glow-cyan'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Subsystems ({components.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('milestones')}
          className={`flex items-center gap-2 px-4 py-2.5 font-bold border-b-2 transition-all whitespace-nowrap rounded-t-xl ${
            activeTab === 'milestones'
              ? 'border-cyan-400 text-cyan-300 bg-cyan-500/10 shadow-glow-cyan'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <Milestone className="w-4 h-4" />
          <span>Milestones & Versions</span>
        </button>

        <button
          onClick={() => setActiveTab('flags')}
          className={`flex items-center gap-2 px-4 py-2.5 font-bold border-b-2 transition-all whitespace-nowrap rounded-t-xl ${
            activeTab === 'flags'
              ? 'border-cyan-400 text-cyan-300 bg-cyan-500/10 shadow-glow-cyan'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <Flag className="w-4 h-4" />
          <span>Flag Authority ({flagTypes.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('workflow')}
          className={`flex items-center gap-2 px-4 py-2.5 font-bold border-b-2 transition-all whitespace-nowrap rounded-t-xl ${
            activeTab === 'workflow'
              ? 'border-cyan-400 text-cyan-300 bg-cyan-500/10 shadow-glow-cyan'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <GitBranch className="w-4 h-4" />
          <span>State Machine Engine</span>
        </button>
      </div>

      {/* Tab 1: Users & RBAC */}
      {activeTab === 'users' && (
        <div className="space-y-4 font-mono">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400">
              Configure operator roles, security group memberships, and external contributor permissions.
            </p>
            <button
              onClick={() => setShowAddUserModal(true)}
              className="cyber-btn-primary !px-3.5 !py-1.5 text-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Provision Operator</span>
            </button>
          </div>

          <div className="bg-slate-950/80 border border-cyan-500/20 rounded-2xl overflow-hidden shadow-cyber-card cyber-corners">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/90 text-[10px] uppercase font-bold tracking-widest text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Operator</th>
                  <th className="py-3.5 px-4">Account Origin</th>
                  <th className="py-3.5 px-4">Clearance Role (RBAC)</th>
                  <th className="py-3.5 px-4">Classified Group Access</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/80">
                {users.map((u) => {
                  const isSec = (u.security_group_ids || []).includes('grp_sec');
                  return (
                    <tr key={u.id} className="hover:bg-slate-900/60 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={u.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                            alt={u.name}
                            className="w-8 h-8 rounded-full border border-slate-700 object-cover"
                          />
                          <div>
                            <div className="font-bold text-white text-xs">{u.name}</div>
                            <div className="text-[10px] text-cyan-400/80">@{u.username} · {u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {u.is_external ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-slate-900 border border-slate-700 text-slate-400 text-[10px]">
                            <ExternalLink className="w-3 h-3" />
                            <span>GitHub External</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-[10px] shadow-glow-neon">
                            <Check className="w-3 h-3" />
                            <span>Internal Operator</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          disabled={u.is_external}
                          className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono disabled:opacity-50"
                        >
                          <option value="admin">👑 Admin</option>
                          <option value="triager">🔍 Triager</option>
                          <option value="developer">💻 Developer</option>
                          <option value="security">🛡️ Security</option>
                          <option value="reporter">📝 Reporter</option>
                        </select>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleToggleSecurityGroup(u)}
                          disabled={u.is_external}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono transition-all ${
                            isSec
                              ? 'bg-purple-950/80 text-purple-300 border border-purple-500/50 shadow-glow-purple hover:bg-purple-900/80'
                              : 'bg-slate-900 text-slate-400 border border-slate-800 hover:border-slate-700 hover:text-slate-200'
                          } disabled:opacity-40`}
                        >
                          <Shield className="w-3.5 h-3.5" />
                          <span>{isSec ? 'Security Core Team (Active)' : 'Standard Access'}</span>
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-mono">
          <div className="lg:col-span-2 space-y-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest">Configured Subsystem Vectors</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {components.map((c) => (
                <div key={c.id} className="p-4 rounded-2xl bg-slate-950/80 border border-cyan-500/15 flex items-start justify-between cyber-corners">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-xs">{c.name}</span>
                      <code className="text-[10px] bg-slate-900 text-cyan-400 px-2 py-0.5 rounded-md border border-slate-800">
                        {c.id}
                      </code>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1.5 font-sans">{c.description || 'No description provided.'}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteComponent(c.id)}
                    className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-slate-900 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-950/90 border border-cyan-500/20 space-y-4 cyber-corners">
            <h3 className="text-xs font-bold text-white uppercase tracking-widest">Add Subsystem Vector</h3>
            <form onSubmit={handleCreateComponent} className="space-y-3">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Component ID</label>
                <input
                  type="text"
                  value={newCompData.id}
                  onChange={(e) => setNewCompData({ ...newCompData, id: e.target.value })}
                  placeholder="e.g. telemetry, crypto, auth"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Display Name</label>
                <input
                  type="text"
                  value={newCompData.name}
                  onChange={(e) => setNewCompData({ ...newCompData, name: e.target.value })}
                  placeholder="e.g. Telemetry Ingestion Engine"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-sans"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Description</label>
                <textarea
                  value={newCompData.description}
                  onChange={(e) => setNewCompData({ ...newCompData, description: e.target.value })}
                  placeholder="Vector responsibilities, security scope, and engineering triage lead..."
                  rows={2}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-sans"
                />
              </div>
              <button
                type="submit"
                className="w-full cyber-btn-primary !py-2 text-xs font-bold justify-center"
              >
                <Plus className="w-4 h-4" />
                <span>Save Subsystem Vector</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Tab 3: Milestones & Versions */}
      {activeTab === 'milestones' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 font-mono">
          {/* Milestones */}
          <div className="p-5 rounded-2xl bg-slate-950/90 border border-cyan-500/20 space-y-4 cyber-corners">
            <h3 className="text-xs font-bold text-white uppercase tracking-widest flex items-center justify-between">
              <span>Target Release Milestones</span>
              <span className="text-[10px] text-slate-400 font-normal">{milestones.length} active</span>
            </h3>

            <div className="space-y-2">
              {milestones.map((m) => (
                <div key={m.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="flex items-center gap-2">
                    <Milestone className="w-4 h-4 text-cyan-400" />
                    <span className="font-bold text-white text-xs">{m.name}</span>
                    {m.due_date && (
                      <span className="text-[10px] text-cyan-300 font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                        Target: {m.due_date}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteMilestone(m.id)}
                    className="p-1 text-slate-500 hover:text-red-400 rounded hover:bg-slate-800 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <form onSubmit={handleCreateMilestone} className="pt-2 border-t border-slate-800 flex gap-2">
              <input
                type="text"
                value={newMilestoneData.name}
                onChange={(e) => setNewMilestoneData({ ...newMilestoneData, name: e.target.value })}
                placeholder="Milestone (e.g. v2.4-threat-patch)"
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                required
              />
              <input
                type="date"
                value={newMilestoneData.due_date}
                onChange={(e) => setNewMilestoneData({ ...newMilestoneData, due_date: e.target.value })}
                className="bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
              />
              <button
                type="submit"
                className="cyber-btn-primary !px-3.5 !py-1.5 text-xs font-bold"
              >
                Add
              </button>
            </form>
          </div>

          {/* Software Versions */}
          <div className="p-5 rounded-2xl bg-slate-950/90 border border-cyan-500/20 space-y-4 cyber-corners">
            <h3 className="text-xs font-bold text-white uppercase tracking-widest flex items-center justify-between">
              <span>Software Build Versions</span>
              <span className="text-[10px] text-slate-400 font-normal">{versions.length} active</span>
            </h3>

            <div className="space-y-2">
              {versions.map((v) => (
                <div key={v.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="font-bold text-white text-xs font-mono">{v.name}</span>
                  <button
                    onClick={() => handleDeleteVersion(v.id)}
                    className="p-1 text-slate-500 hover:text-red-400 rounded hover:bg-slate-800 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <form onSubmit={handleCreateVersion} className="pt-2 border-t border-slate-800 flex gap-2">
              <input
                type="text"
                value={newVersionData.name}
                onChange={(e) => setNewVersionData({ name: e.target.value })}
                placeholder="Version tag (e.g. 2.1.2-sec-hardened)"
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                required
              />
              <button
                type="submit"
                className="cyber-btn-neon !px-3.5 !py-1.5 text-xs font-bold"
              >
                Add
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Tab 4: Flag Authority */}
      {activeTab === 'flags' && (
        <div className="bg-slate-950/90 border border-cyan-500/20 rounded-2xl p-5 space-y-4 cyber-corners font-mono">
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-widest">Cryptographic Clearance Flag Types</h3>
            <p className="text-xs text-slate-400 mt-1 font-sans">
              Configure clearance requirements for requesting review flags and cryptographic authority required to grant (+) or deny (-) transitions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {flagTypes.map((ft) => (
              <div key={ft.id} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Flag className="w-4 h-4 text-amber-400" />
                    <span className="font-bold text-white text-xs">{ft.name}</span>
                  </div>
                  <code className="text-[10px] text-cyan-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">{ft.id}</code>
                </div>

                <div className="text-xs space-y-1.5 text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Request Role:</span>
                    <span className="font-bold text-cyan-400 uppercase">{ft.request_role}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Grant Role (+/-):</span>
                    <span className="font-bold text-emerald-400 uppercase">{ft.grant_role}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Target Object:</span>
                    <span className="text-slate-400">{ft.target}</span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-950 border border-cyan-500/30 rounded-2xl p-6 space-y-4 shadow-2xl cyber-corners">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold font-mono text-white">PROVISION OPERATOR ACCOUNT</h3>
              <button onClick={() => setShowAddUserModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3 font-mono">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-300 mb-1">Username</label>
                <input
                  type="text"
                  value={newUserData.username}
                  onChange={(e) => setNewUserData({ ...newUserData, username: e.target.value })}
                  placeholder="e.g. m_vance"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  value={newUserData.name}
                  onChange={(e) => setNewUserData({ ...newUserData, name: e.target.value })}
                  placeholder="e.g. Marcus Vance"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-sans"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-300 mb-1">Email Address</label>
                <input
                  type="email"
                  value={newUserData.email}
                  onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                  placeholder="mvance@triarc.sec"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-300 mb-1">System Role (RBAC)</label>
                <select
                  value={newUserData.role}
                  onChange={(e) => setNewUserData({ ...newUserData, role: e.target.value as UserRole })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="developer">Developer</option>
                  <option value="triager">Triager</option>
                  <option value="admin">Admin</option>
                  <option value="security">Security</option>
                  <option value="reporter">Reporter</option>
                </select>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newUserData.isSecGroup}
                    onChange={(e) => setNewUserData({ ...newUserData, isSecGroup: e.target.checked })}
                    className="rounded bg-slate-950 border-slate-700 text-cyan-500 focus:ring-0"
                  />
                  <span>Grant clearance to Security Core Team (<code>grp_sec</code>)</span>
                </label>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="flex-1 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-mono transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 cyber-btn-primary !py-2 text-xs font-bold justify-center"
                >
                  Provision Operator
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

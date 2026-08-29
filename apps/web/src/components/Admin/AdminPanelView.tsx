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
  RefreshCw
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
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-2xl text-purple-400">
            <Shield className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center space-x-2">
              <span>Administration & Governance</span>
              <span className="text-xs bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full font-mono">
                Admin Exclusive
              </span>
            </h1>
            <p className="text-sm text-slate-400">
              Manage organization users, role permissions, product subsystems, release milestones, and state machine workflows.
            </p>
          </div>
        </div>

        <button
          onClick={loadAllData}
          disabled={loading}
          className="flex items-center space-x-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition-colors text-sm font-medium self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-3.5 bg-emerald-950/60 border border-emerald-800/80 rounded-xl flex items-center space-x-3 text-emerald-200 text-sm animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 bg-red-950/60 border border-red-800/80 rounded-xl flex items-center space-x-3 text-red-200 text-sm">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-800 space-x-2 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center space-x-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'users'
              ? 'border-purple-500 text-purple-400 bg-purple-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Users & RBAC ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('components')}
          className={`flex items-center space-x-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'components'
              ? 'border-cyan-500 text-cyan-400 bg-cyan-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Components ({components.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('milestones')}
          className={`flex items-center space-x-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'milestones'
              ? 'border-blue-500 text-blue-400 bg-blue-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <Milestone className="w-4 h-4" />
          <span>Milestones & Versions</span>
        </button>

        <button
          onClick={() => setActiveTab('flags')}
          className={`flex items-center space-x-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'flags'
              ? 'border-amber-500 text-amber-400 bg-amber-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <Flag className="w-4 h-4" />
          <span>Flag Types ({flagTypes.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('workflow')}
          className={`flex items-center space-x-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'workflow'
              ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <GitBranch className="w-4 h-4" />
          <span>State Machine Workflow</span>
        </button>
      </div>

      {/* Tab 1: Users & RBAC */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400">
              Configure system roles, security group memberships, and examine external GitHub contributor records.
            </p>
            <button
              onClick={() => setShowAddUserModal(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold shadow transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add User</span>
            </button>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/80 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Account Type</th>
                  <th className="py-3 px-4">Assigned Role (RBAC)</th>
                  <th className="py-3 px-4">Security Group Membership</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {users.map((u) => {
                  const isSec = (u.security_group_ids || []).includes('grp_sec');
                  return (
                    <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-3">
                          <img
                            src={u.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                            alt={u.name}
                            className="w-8 h-8 rounded-full border border-slate-700 object-cover"
                          />
                          <div>
                            <div className="font-medium text-white">{u.name}</div>
                            <div className="text-xs text-slate-500 font-mono">@{u.username} · {u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {u.is_external ? (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400 text-xs font-medium">
                            <ExternalLink className="w-3 h-3" />
                            <span>GitHub External</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
                            <Check className="w-3 h-3" />
                            <span>Internal Account</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          disabled={u.is_external}
                          className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-purple-500 font-medium disabled:opacity-50"
                        >
                          <option value="admin">👑 Admin</option>
                          <option value="triager">🔍 Triager</option>
                          <option value="developer">💻 Developer</option>
                          <option value="security">🛡️ Security</option>
                          <option value="reporter">📝 Reporter</option>
                        </select>
                      </td>
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => handleToggleSecurityGroup(u)}
                          disabled={u.is_external}
                          className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                            isSec
                              ? 'bg-red-500/20 text-red-300 border-red-500/40 hover:bg-red-500/30'
                              : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:border-slate-600 hover:text-slate-200'
                          } disabled:opacity-40`}
                        >
                          <Shield className="w-3.5 h-3.5" />
                          <span>{isSec ? 'Security Core Team (Active)' : 'Not Member'}</span>
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Configured Subsystem Components</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {components.map((c) => (
                <div key={c.id} className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-white text-sm">{c.name}</span>
                      <code className="text-[10px] bg-slate-800 text-cyan-400 px-1.5 py-0.5 rounded border border-slate-700">
                        {c.id}
                      </code>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{c.description || 'No description provided.'}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteComponent(c.id)}
                    className="p-1 text-slate-500 hover:text-red-400 rounded hover:bg-slate-800 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Add Subsystem Component</h3>
            <form onSubmit={handleCreateComponent} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Component ID</label>
                <input
                  type="text"
                  value={newCompData.id}
                  onChange={(e) => setNewCompData({ ...newCompData, id: e.target.value })}
                  placeholder="e.g. mobile, search, telemetry"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Display Name</label>
                <input
                  type="text"
                  value={newCompData.name}
                  onChange={(e) => setNewCompData({ ...newCompData, name: e.target.value })}
                  placeholder="e.g. Mobile Apps (iOS/Android)"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Description</label>
                <textarea
                  value={newCompData.description}
                  onChange={(e) => setNewCompData({ ...newCompData, description: e.target.value })}
                  placeholder="Responsibilities, scope, and engineering triage team..."
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-semibold shadow transition-all flex items-center justify-center space-x-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Save Component</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Tab 3: Milestones & Versions */}
      {activeTab === 'milestones' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Milestones */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center justify-between">
              <span>Target Milestones</span>
              <span className="text-xs text-slate-400 font-normal">{milestones.length} defined</span>
            </h3>

            <div className="space-y-2">
              {milestones.map((m) => (
                <div key={m.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <div className="flex items-center space-x-2">
                    <Milestone className="w-4 h-4 text-blue-400" />
                    <span className="font-semibold text-white text-sm">{m.name}</span>
                    {m.due_date && (
                      <span className="text-[11px] text-slate-400 font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                        Due {m.due_date}
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
                placeholder="Milestone (e.g. v2.3)"
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                required
              />
              <input
                type="date"
                value={newMilestoneData.due_date}
                onChange={(e) => setNewMilestoneData({ ...newMilestoneData, due_date: e.target.value })}
                className="bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition-colors"
              >
                Add
              </button>
            </form>
          </div>

          {/* Software Versions */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center justify-between">
              <span>Software Versions</span>
              <span className="text-xs text-slate-400 font-normal">{versions.length} defined</span>
            </h3>

            <div className="space-y-2">
              {versions.map((v) => (
                <div key={v.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <span className="font-semibold text-white text-sm font-mono">{v.name}</span>
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
                placeholder="Version string (e.g. 2.1.1-rc1)"
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                required
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-semibold transition-colors"
              >
                Add
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Tab 4: Flag Types */}
      {activeTab === 'flags' && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Permissioned Request Flag Types</h3>
            <p className="text-xs text-slate-400 mt-1">
              Configure who is authorized to request flags and who has authority to grant (+) or deny (-) resolutions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {flagTypes.map((ft) => (
              <div key={ft.id} className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Flag className="w-4 h-4 text-amber-400" />
                    <span className="font-bold text-white text-sm">{ft.name}</span>
                  </div>
                  <code className="text-[10px] text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded">{ft.id}</code>
                </div>

                <div className="text-xs space-y-1.5 text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Request Role:</span>
                    <span className="font-semibold text-cyan-400 uppercase">{ft.request_role}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Grant Role (+/-):</span>
                    <span className="font-semibold text-emerald-400 uppercase">{ft.grant_role}</span>
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
          <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center space-x-2">
                  <GitBranch className="w-4 h-4 text-emerald-400" />
                  <span>Interactive Workflow State Machine</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Visual representation of valid bug state transitions, guard condition checks, and automated hooks.
                </p>
              </div>
            </div>

            {workflow && (
              <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 overflow-x-auto">
                <WorkflowGraph workflow={workflow} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Create Internal User</h3>
              <button onClick={() => setShowAddUserModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Username</label>
                <input
                  type="text"
                  value={newUserData.username}
                  onChange={(e) => setNewUserData({ ...newUserData, username: e.target.value })}
                  placeholder="e.g. jdoe"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  value={newUserData.name}
                  onChange={(e) => setNewUserData({ ...newUserData, name: e.target.value })}
                  placeholder="e.g. John Doe"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
                <input
                  type="email"
                  value={newUserData.email}
                  onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                  placeholder="jdoe@triarc.dev"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">System Role (RBAC)</label>
                <select
                  value={newUserData.role}
                  onChange={(e) => setNewUserData({ ...newUserData, role: e.target.value as UserRole })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="developer">Developer</option>
                  <option value="triager">Triager</option>
                  <option value="admin">Admin</option>
                  <option value="security">Security</option>
                  <option value="reporter">Reporter</option>
                </select>
              </div>

              <div className="pt-2">
                <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newUserData.isSecGroup}
                    onChange={(e) => setNewUserData({ ...newUserData, isSecGroup: e.target.checked })}
                    className="rounded bg-slate-950 border-slate-700 text-purple-600 focus:ring-purple-500"
                  />
                  <span>Grant membership in Security Core Team (<code>grp_sec</code>)</span>
                </label>
              </div>

              <div className="pt-4 flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition-colors"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

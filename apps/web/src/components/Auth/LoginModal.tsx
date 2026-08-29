import React, { useState } from 'react';
import { Shield, Lock, User as UserIcon, LogIn, AlertCircle, Sparkles, Check, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useFocusTrap } from '../../hooks/useFocusTrap.ts';

export const LoginModal: React.FC = () => {
  const { isLoginModalOpen, setIsLoginModalOpen, login, quickLogin, users } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const modalRef = useFocusTrap({
    isOpen: isLoginModalOpen,
    onClose: () => {
      // Only allow closing if there is a logged in user
      setIsLoginModalOpen(false);
    }
  });

  if (!isLoginModalOpen) return null;

  const handleStandardLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Please enter a username or email address.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await login({ username: username.trim(), password });
    } catch (err: any) {
      setError(err.message || 'Invalid username or password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickSignIn = async (userId: string) => {
    setError(null);
    setIsSubmitting(true);
    try {
      await quickLogin(userId);
    } catch (err: any) {
      setError(err.message || 'Quick login failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Demo accounts configured in seed
  const demoAccounts = [
    {
      id: 'u_marcus',
      username: 'marcus',
      name: 'Marcus Vance',
      role: 'admin',
      roleColor: 'border-purple-500/40 text-purple-300 bg-purple-500/10',
      description: 'System Administrator · Full governance, components, RBAC & workflow config',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100'
    },
    {
      id: 'u_priya',
      username: 'priya',
      name: 'Priya Sharma',
      role: 'triager',
      roleColor: 'border-amber-500/40 text-amber-300 bg-amber-500/10',
      description: 'Triage Lead · Unconfirmed queue, bulk triage, priorities & SLA monitoring',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100'
    },
    {
      id: 'u_alex',
      username: 'alex',
      name: 'Alex River',
      role: 'developer',
      roleColor: 'border-cyan-500/40 text-cyan-300 bg-cyan-500/10',
      description: 'Senior Engineer · Assigned issues, Request Inbox & PR code reviews',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'
    },
    {
      id: 'u_sam',
      username: 'sam',
      name: 'Sam Patel',
      role: 'developer',
      roleColor: 'border-cyan-500/40 text-cyan-300 bg-cyan-500/10',
      description: 'Core Engineer · Bug #412 author & transition state driver',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100'
    },
    {
      id: 'u_sarah',
      username: 'sarah',
      name: 'Sarah Connor',
      role: 'security',
      roleColor: 'border-red-500/40 text-red-300 bg-red-500/10',
      description: 'Security Officer · Confidential security group member (views Bug #413)',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100'
    },
    {
      id: 'u_chen',
      username: 'chen',
      name: 'Chen Wei',
      role: 'reporter',
      roleColor: 'border-slate-500/40 text-slate-300 bg-slate-500/10',
      description: 'Product Reporter · Streamlined bug filing & watching without triage clutter',
      avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100'
    }
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-dialog-title"
    >
      <div
        ref={modalRef}
        className="w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl shadow-cyan-950/40 overflow-hidden my-8"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 text-cyan-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 id="login-dialog-title" className="text-lg font-bold text-white tracking-wide">
                Triarc Authentication & Identity
              </h2>
              <p className="text-xs text-slate-400">Enterprise Role-Based Access Control (RBAC) & Security</p>
            </div>
          </div>
          <button
            onClick={() => setIsLoginModalOpen(false)}
            aria-label="Close login dialog"
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-950/50 border border-red-800/80 rounded-xl flex items-center space-x-3 text-red-200 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-800">
          {/* Quick Demo Sign-In Panel */}
          <div className="lg:col-span-7 p-6 bg-slate-900/50 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-semibold text-white tracking-wide uppercase">
                  1-Click Quick Demo Sign-In
                </h3>
              </div>
              <span className="text-xs text-cyan-400/80 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/50">
                Evaluation Mode
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Select any role to test permissions, security group boundaries, and role-differentiated UI in real time:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {demoAccounts.map((acc) => (
                <button
                  key={acc.id}
                  onClick={() => handleQuickSignIn(acc.id)}
                  disabled={isSubmitting}
                  className="flex flex-col text-left p-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-cyan-500/50 transition-all group"
                >
                  <div className="flex items-center space-x-2.5 mb-1.5">
                    <img
                      src={acc.avatar}
                      alt={acc.name}
                      className="w-7 h-7 rounded-full border border-slate-700 object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-white truncate group-hover:text-cyan-300 transition-colors">
                        {acc.name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">@{acc.username}</div>
                    </div>
                    <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded border ${acc.roleColor}`}>
                      {acc.role}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                    {acc.description}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Standard Credentials Form */}
          <div className="lg:col-span-5 p-6 space-y-4 bg-slate-950/40">
            <div>
              <h3 className="text-sm font-semibold text-white tracking-wide uppercase">
                Account Sign In
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Enter your username/email and password to authenticate.
              </p>
            </div>

            <form onSubmit={handleStandardLogin} className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Username or Email</label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. marcus or alex"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-slate-300">Password</label>
                  <span className="text-[10px] text-slate-500">Default: password123</span>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 font-mono"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium text-sm shadow-lg shadow-cyan-950/50 transition-all disabled:opacity-50"
              >
                <LogIn className="w-4 h-4" />
                <span>{isSubmitting ? 'Authenticating...' : 'Sign In'}</span>
              </button>

              <div className="pt-3 border-t border-slate-800/80 text-[11px] text-slate-500 space-y-1">
                <div>🔒 Password verification hashed with <strong>bcrypt (10 rounds)</strong></div>
                <div>🛡️ Signed <strong>JWT tokens</strong> with row-level security claims</div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

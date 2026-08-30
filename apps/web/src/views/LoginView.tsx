import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import { Shield, Lock, Mail, ArrowRight, UserCheck, AlertCircle, Loader2 } from 'lucide-react';

export const LoginView: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, quickLogin, users } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Read destination redirect
  const params = new URLSearchParams(location.search);
  const redirectPath = params.get('from') || '/projects';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please enter both your email/username and password');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await login({ username: email.trim(), password: password.trim() });
      navigate(redirectPath, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Invalid credentials. Please try demo accounts below.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickSignIn = async (userId: string) => {
    setIsSubmitting(true);
    setError(null);
    try {
      await quickLogin(userId);
      navigate(redirectPath, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Failed to sign in as selected user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const demoAccounts = [
    {
      id: 'u_alex',
      name: 'Alex River',
      role: 'DEVELOPER',
      desc: 'Triarc Core Platform dev, triage queues & PR fixes',
      badge: 'bg-blue-950 text-blue-300 border-blue-600'
    },
    {
      id: 'u_sam',
      name: 'Sam Patel',
      role: 'DEVELOPER',
      desc: 'Offline sync engine & reviewer',
      badge: 'bg-emerald-950 text-emerald-300 border-emerald-600'
    },
    {
      id: 'u_priya',
      name: 'Priya Sharma',
      role: 'TRIAGER',
      desc: 'Triage matrix lead, bulk actions & approvals',
      badge: 'bg-amber-950 text-amber-300 border-amber-600'
    },
    {
      id: 'u_marcus',
      name: 'Marcus Vance',
      role: 'SYSTEM ADMIN',
      desc: 'Global system configuration & project creation',
      badge: 'bg-purple-950 text-purple-300 border-purple-600'
    }
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-8 font-mono relative z-10">
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 border border-border bg-[#0d0d0d] shadow-2xl rounded-sm overflow-hidden">
        {/* Left Column: Sign In Form */}
        <main className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-border">
          <div>
            <div className="flex items-center gap-2.5 mb-6">
              <div className="w-9 h-9 bg-foreground text-background flex items-center justify-center font-bold rounded-sm">
                <Shield className="w-5 h-5 text-background" />
              </div>
              <div>
                <span className="text-[10px] text-[#ea580c] font-bold tracking-widest uppercase block">
                  ZERO TRUST IDENTITY
                </span>
                <span className="text-sm font-bold text-foreground tracking-wider uppercase">
                  TRIARC ACCESS GATEWAY
                </span>
              </div>
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-foreground uppercase tracking-tight mb-2">
              Sign In to Your Workspace
            </h1>
            <p className="text-xs text-muted-foreground mb-6 uppercase">
              Enter your corporate credentials to access project telemetry, issues, and audit flows.
            </p>

            {error && (
              <div
                role="alert"
                aria-live="assertive"
                className="p-3 mb-6 bg-red-950/40 border border-red-500 text-red-300 text-xs flex items-start gap-2.5 rounded-sm"
              >
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold uppercase">Authentication Error:</strong>
                  <span>{error}</span>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <label
                  htmlFor="login-email"
                  className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1.5"
                >
                  Corporate Email or Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="login-email"
                    type="text"
                    required
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="alex@triarc.dev or alex"
                    className="w-full pl-9 pr-3 py-2.5 bg-[#080808] border border-border focus:border-foreground text-foreground text-xs font-mono outline-none rounded-sm transition-all"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="login-password"
                  className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1.5"
                >
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="login-password"
                    type="password"
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-3 py-2.5 bg-[#080808] border border-border focus:border-foreground text-foreground text-xs font-mono outline-none rounded-sm transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-foreground text-background font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-white transition-all rounded-sm disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>AUTHENTICATING IDENTITY...</span>
                  </>
                ) : (
                  <>
                    <span>AUTHENTICATE & ENTER</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="pt-6 mt-6 border-t border-border/60 text-[10px] text-muted-foreground uppercase flex items-center justify-between">
            <span>SOC 2 Type II Encrypted</span>
            <span>Version 3.2.0</span>
          </div>
        </main>

        {/* Right Column: Demo Accounts Quick Sign-In */}
        <aside className="lg:col-span-5 p-6 sm:p-8 bg-[#101010] flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <UserCheck className="w-4 h-4 text-[#ea580c]" />
              <h2 className="text-xs font-bold text-foreground uppercase tracking-wider">
                Instant Demo Access
              </h2>
            </div>
            <p className="text-[11px] text-muted-foreground mb-4 uppercase leading-relaxed">
              Select a preconfigured persona to experience role-scoped triage permissions and project workflows.
            </p>

            <div className="space-y-2.5">
              {demoAccounts.map((account) => (
                <button
                  key={account.id}
                  type="button"
                  onClick={() => handleQuickSignIn(account.id)}
                  disabled={isSubmitting}
                  className="w-full text-left p-3 bg-[#080808] hover:bg-[#181818] border border-border hover:border-foreground transition-all rounded-sm group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-foreground group-hover:text-[#ea580c] transition-colors">
                      {account.name}
                    </span>
                    <span className={`px-1.5 py-0.2 text-[9px] font-bold uppercase border rounded-xs ${account.badge}`}>
                      {account.role}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground uppercase">
                    {account.desc}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div className="p-3 bg-[#080808] border border-border/60 text-[10px] text-muted-foreground uppercase mt-6 rounded-sm">
            <span className="text-foreground font-bold block mb-0.5">Note:</span>
            Default seed credentials for all accounts: <code className="text-[#ea580c]">password123</code>
          </div>
        </aside>
      </div>
    </div>
  );
};

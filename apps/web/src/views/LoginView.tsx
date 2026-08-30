import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import { Shield, Lock, Mail, ArrowRight, UserCheck, AlertCircle, Loader2, Github, ChevronDown } from 'lucide-react';
import { CreateGitHubProjectModal } from '../components/Import/CreateGitHubProjectModal.tsx';

export const LoginView: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register, users } = useAuth();

  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Login fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Register fields
  const [regUsername, setRegUsername] = useState('');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('password123');

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGitHubModalOpen, setIsGitHubModalOpen] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);

  // Read destination redirect and demo prefill params
  const params = new URLSearchParams(location.search);
  const redirectPath = params.get('from') || '/workspace';
  const demoParam = params.get('demo')?.toLowerCase();

  // Demo access is a side door, not the main entrance: collapsed by default,
  // and only opened up front when the visitor arrived via a demo link.
  const [showDemo, setShowDemo] = useState(!!demoParam);

  // Pre-fill demo account if specified in query param
  useEffect(() => {
    if (demoParam) {
      if (demoParam.includes('alex')) {
        setEmail('alex@triarc.dev');
        setPassword('password123');
      } else if (demoParam.includes('sam')) {
        setEmail('sam@triarc.dev');
        setPassword('password123');
      } else if (demoParam.includes('priya')) {
        setEmail('priya@triarc.dev');
        setPassword('password123');
      } else if (demoParam.includes('marcus')) {
        setEmail('marcus@triarc.dev');
        setPassword('password123');
      } else {
        setEmail(`${demoParam}@triarc.dev`);
        setPassword('password123');
      }
    }
  }, [demoParam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please enter both your email/username and password');
      setTimeout(() => errorRef.current?.focus(), 50);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await login({ username: email.trim(), password: password.trim() });
      navigate(redirectPath, { replace: true });
    } catch (err: any) {
      setError(
        err.message ||
        'Unable to authenticate. Please check your credentials or register a new account.'
      );
      setTimeout(() => errorRef.current?.focus(), 50);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regUsername.trim() || !regEmail.trim() || !regPassword.trim()) {
      setError('Username, email, and password are required for registration.');
      setTimeout(() => errorRef.current?.focus(), 50);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await register({
        username: regUsername.trim().toLowerCase(),
        name: regName.trim() || regUsername.trim(),
        email: regEmail.trim().toLowerCase(),
        password: regPassword.trim()
      });
      navigate(redirectPath, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Registration failed. Username or email may already be in use.');
      setTimeout(() => errorRef.current?.focus(), 50);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickSignIn = async (account: typeof demoAccounts[0]) => {
    setIsSubmitting(true);
    setError(null);
    try {
      await login({ username: account.keyMatch, password: 'password123' });
      navigate(redirectPath, { replace: true });
    } catch (err: any) {
      setError(
        err.message ||
        'Unable to connect to Triarc authentication service. Please verify server connectivity.'
      );
      setTimeout(() => errorRef.current?.focus(), 50);
    } finally {
      setIsSubmitting(false);
    }
  };

  const switchToRegisterWithUsername = (un: string) => {
    setAuthMode('register');
    setRegUsername(un);
    setRegName(un.charAt(0).toUpperCase() + un.slice(1));
    setRegEmail(`${un.toLowerCase()}@triarc.dev`);
    setError(null);
  };


  const demoAccounts = [
    {
      id: 'u_alex',
      name: 'Alex River',
      role: 'DEVELOPER',
      desc: 'Triarc Core Platform dev, triage queues & PR fixes',
      badge: 'bg-blue-950 text-blue-300 border-blue-600',
      keyMatch: 'alex'
    },
    {
      id: 'u_sam',
      name: 'Sam Patel',
      role: 'DEVELOPER',
      desc: 'Offline sync engine & reviewer',
      badge: 'bg-emerald-950 text-emerald-300 border-emerald-600',
      keyMatch: 'sam'
    },
    {
      id: 'u_priya',
      name: 'Priya Sharma',
      role: 'TRIAGER',
      desc: 'Triage matrix lead, bulk actions & approvals',
      badge: 'bg-amber-950 text-amber-300 border-amber-600',
      keyMatch: 'priya'
    },
    {
      id: 'u_marcus',
      name: 'Marcus Vance',
      role: 'SYSTEM ADMIN',
      desc: 'Global system configuration & project creation',
      badge: 'bg-purple-950 text-purple-300 border-purple-600',
      keyMatch: 'marcus'
    }
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-8 font-mono relative z-10">
      <div className="w-full max-w-md border border-border bg-[#0d0d0d] shadow-2xl rounded-sm overflow-hidden">
        <main className="p-6 sm:p-8">
          <div>
            <div className="flex items-center gap-2.5 mb-6">
              <div className="w-9 h-9 bg-foreground text-background flex items-center justify-center font-bold rounded-sm">
                <Shield className="w-5 h-5 text-background" />
              </div>
              <div>
                <span className="text-[10px] text-[#B497CF] font-bold tracking-widest uppercase block">
                  ZERO TRUST IDENTITY
                </span>
                <span className="text-sm font-bold text-foreground tracking-wider uppercase">
                  TRIARC ACCESS GATEWAY
                </span>
              </div>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="grid grid-cols-2 gap-1 border border-border p-1 bg-[#141414] mb-4 rounded-sm">
              <button
                type="button"
                onClick={() => { setAuthMode('login'); setError(null); }}
                className={`py-2 text-xs font-bold uppercase transition-all rounded-xs flex items-center justify-center gap-1.5 ${
                  authMode === 'login'
                    ? 'bg-foreground text-background shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <span>SIGN IN</span>
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode('register'); setError(null); }}
                className={`py-2 text-xs font-bold uppercase transition-all rounded-xs flex items-center justify-center gap-1.5 ${
                  authMode === 'register'
                    ? 'bg-[#B497CF] text-white shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <span>REGISTER NEW OPERATOR</span>
              </button>
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-foreground uppercase tracking-tight mb-2">
              {authMode === 'login' ? 'Sign In to Your Workspace' : 'Create Operator Account'}
            </h1>
            <p className="text-xs text-muted-foreground mb-6 uppercase">
              {authMode === 'login'
                ? 'Enter your corporate credentials to access project telemetry, issues, and audit flows.'
                : 'Self-service registration to initialize your identity dossier in the Triarc access matrix.'}
            </p>

            {error && (
              <div
                ref={errorRef}
                id="login-error"
                tabIndex={-1}
                role="alert"
                aria-live="assertive"
                className="p-3 mb-6 bg-red-950/40 border border-red-500 text-red-300 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-sm outline-none focus:ring-1 focus:ring-red-400"
              >
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-bold uppercase">Authentication Error:</strong>
                    <span>{error}</span>
                  </div>
                </div>
                {error.toLowerCase().includes('not found') && email && (
                  <button
                    type="button"
                    onClick={() => switchToRegisterWithUsername(email)}
                    className="px-2.5 py-1 bg-red-800 hover:bg-red-700 text-white font-bold text-[10px] uppercase border border-red-400 shrink-0 rounded-xs"
                  >
                    + REGISTER "{email}"
                  </button>
                )}
              </div>
            )}

            {authMode === 'login' ? (
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
                      name="username"
                      type="text"
                      required
                      autoComplete="username"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="alex@triarc.dev or alex"
                      className="w-full pl-9 pr-3 py-2.5 bg-[#080808] border border-border focus:border-foreground text-foreground text-xs font-mono outline-none rounded-sm transition-all focus-visible:ring-1 focus-visible:ring-[#B497CF]"
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
                      name="password"
                      type="password"
                      required
                      autoComplete="current-password"
                      aria-describedby={error ? 'login-error' : undefined}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-9 pr-3 py-2.5 bg-[#080808] border border-border focus:border-foreground text-foreground text-xs font-mono outline-none rounded-sm transition-all focus-visible:ring-1 focus-visible:ring-[#B497CF]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-foreground text-background font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-white transition-all rounded-sm disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-[#B497CF] outline-none"
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
            ) : (
              <form onSubmit={handleRegisterSubmit} className="space-y-3" noValidate>
                <div>
                  <label
                    htmlFor="reg-username"
                    className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1"
                  >
                    Operator Handle / Username *
                  </label>
                  <input
                    id="reg-username"
                    type="text"
                    required
                    value={regUsername}
                    onChange={(e) => {
                      setRegUsername(e.target.value);
                      if (!regEmail || regEmail.endsWith('@triarc.dev')) {
                        setRegEmail(`${e.target.value.toLowerCase()}@triarc.dev`);
                      }
                    }}
                    placeholder="e.g. abh or lead_eng"
                    className="w-full px-3 py-2 bg-[#080808] border border-border focus:border-foreground text-foreground text-xs font-mono outline-none rounded-sm transition-all uppercase"
                  />
                </div>

                <div>
                  <label
                    htmlFor="reg-name"
                    className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1"
                  >
                    Operator Display Name
                  </label>
                  <input
                    id="reg-name"
                    type="text"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="e.g. Abhishek"
                    className="w-full px-3 py-2 bg-[#080808] border border-border focus:border-foreground text-foreground text-xs font-mono outline-none rounded-sm transition-all"
                  />
                </div>

                <div>
                  <label
                    htmlFor="reg-email"
                    className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1"
                  >
                    Corporate Email Address *
                  </label>
                  <input
                    id="reg-email"
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="e.g. abh@triarc.dev"
                    className="w-full px-3 py-2 bg-[#080808] border border-border focus:border-foreground text-foreground text-xs font-mono outline-none rounded-sm transition-all"
                  />
                </div>

                <div>
                  <label
                    htmlFor="reg-password"
                    className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1"
                  >
                    Password *
                  </label>
                  <input
                    id="reg-password"
                    type="password"
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full px-3 py-2 bg-[#080808] border border-border focus:border-foreground text-foreground text-xs font-mono outline-none rounded-sm transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-[#B497CF] hover:bg-[#c2410c] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all rounded-sm disabled:opacity-50 mt-2 shadow-sm"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>PROVISIONING OPERATOR IDENTITY...</span>
                    </>
                  ) : (
                    <>
                      <span>REGISTER & LAUNCH WORKSPACE</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}

          </div>
        </main>

        {/* Demo access — deliberately a separate, collapsed section so it never
            competes with the real sign-in above it. */}
        <section className="border-t border-border bg-[#0a0a0a]">
          <h2>
            <button
              type="button"
              onClick={() => setShowDemo((v) => !v)}
              aria-expanded={showDemo}
              aria-controls="demo-accounts"
              className="w-full flex items-center gap-2 px-6 sm:px-8 py-3.5 text-left hover:bg-[#101010] transition-colors focus-visible:ring-2 focus-visible:ring-[#B497CF] focus-visible:ring-inset outline-none"
            >
              <UserCheck className="w-3.5 h-3.5 text-[#B497CF] shrink-0" />
              <span className="text-[11px] font-bold text-foreground uppercase tracking-wider flex-1">
                Just exploring? Use a demo account
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform ${showDemo ? 'rotate-180' : ''}`}
              />
            </button>
          </h2>

          {showDemo && (
            <div id="demo-accounts" className="px-6 sm:px-8 pb-6">
              <p className="text-[11px] text-muted-foreground mb-3 leading-relaxed">
                Each persona has different permissions, so the triage queue and available
                actions change with the role you pick.
              </p>

              <div className="grid sm:grid-cols-2 gap-2">
                {demoAccounts.map((account) => {
                  const isSelectedDemo = demoParam && (demoParam === account.keyMatch || account.id.includes(demoParam));
                  return (
                    <button
                      key={account.id}
                      type="button"
                      onClick={() => handleQuickSignIn(account)}
                      disabled={isSubmitting}
                      className={`text-left p-2.5 bg-[#080808] hover:bg-[#181818] border transition-all rounded-sm group disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-[#B497CF] outline-none ${
                        isSelectedDemo
                          ? 'border-[#B497CF] ring-1 ring-[#B497CF] bg-[#140c06]'
                          : 'border-border hover:border-foreground'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1.5 mb-0.5">
                        <span className="text-[11px] font-bold text-foreground group-hover:text-[#B497CF] transition-colors truncate">
                          {account.name}
                        </span>
                        <span className={`px-1.5 py-0.5 text-[8px] font-bold uppercase border rounded-xs shrink-0 ${account.badge}`}>
                          {account.role}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground leading-snug">
                        {account.desc}
                      </p>
                    </button>
                  );
                })}
              </div>

              <p className="mt-3 text-[10px] text-muted-foreground">
                All seed accounts share the password{' '}
                <code className="text-[#B497CF]">password123</code>.
              </p>
            </div>
          )}
        </section>

        <div className="px-6 sm:px-8 py-3 border-t border-border/60 text-[10px] text-muted-foreground uppercase flex items-center justify-between gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setIsGitHubModalOpen(true)}
            className="flex items-center gap-1.5 hover:text-foreground transition-colors focus-visible:ring-2 focus-visible:ring-[#B497CF] outline-none rounded-xs"
          >
            <Github className="w-3 h-3" />
            <span>Import a repo</span>
          </button>
          <span>v3.2.0</span>
        </div>
      </div>

      {/* GitHub Project Creator Modal */}
      <CreateGitHubProjectModal
        isOpen={isGitHubModalOpen}
        onClose={() => setIsGitHubModalOpen(false)}
      />
    </div>
  );
};


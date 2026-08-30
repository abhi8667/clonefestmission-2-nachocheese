import React, { useState } from 'react';
import { Shield, Lock, User as UserIcon, LogIn, AlertCircle, Sparkles, Check, X, KeyRound, Radio, UserPlus, Mail, ChevronDown, UserCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useFocusTrap } from '../../hooks/useFocusTrap.ts';

export const LoginModal: React.FC = () => {
  const { isLoginModalOpen, setIsLoginModalOpen, login, register, users } = useAuth();

  // Mode: 'login' | 'register'
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Demo personas live in their own collapsed section so they never compete
  // with the real sign-in form.
  const [showPersonas, setShowPersonas] = useState(false);

  // Sign In Form
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('password123');

  // Registration Form
  const [regUsername, setRegUsername] = useState('');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('password123');

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const modalRef = useFocusTrap({
    isOpen: isLoginModalOpen,
    onClose: () => {
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

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regUsername.trim() || !regEmail.trim() || !regPassword.trim()) {
      setError('Username, email, and password are required for operator registration.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await register({
        username: regUsername.trim().toLowerCase(),
        name: regName.trim() || regUsername.trim(),
        email: regEmail.trim().toLowerCase(),
        password: regPassword.trim()
      });
    } catch (err: any) {
      setError(err.message || 'Registration failed. Username or email may already be in use.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePersonaSignIn = async (account: typeof demoAccounts[0]) => {
    setError(null);
    setIsSubmitting(true);
    try {
      await login({ username: account.username, password: 'password123' });
    } catch (err: any) {
      setError(err.message || 'Persona authentication failed.');
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

  // Demo accounts configured in seed
  const demoAccounts = [
    {
      id: 'u_marcus',
      username: 'marcus',
      name: 'Marcus Vance',
      role: 'admin',
      clearance: 'LEVEL 5 - SEC OPS LEAD',
      roleColor: 'border-foreground text-background bg-foreground',
      description: 'System Administrator · Full governance, components, RBAC & workflow config',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100'
    },
    {
      id: 'u_priya',
      username: 'priya',
      name: 'Priya Sharma',
      role: 'triager',
      clearance: 'LEVEL 4 - TRIAGE LEAD',
      roleColor: 'border-border text-foreground bg-black',
      description: 'Triage Lead · Unconfirmed queue, bulk triage, priorities & SLA monitoring',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100'
    },
    {
      id: 'u_alex',
      username: 'alex',
      name: 'Alex River',
      role: 'developer',
      clearance: 'LEVEL 3 - CORE DEV',
      roleColor: 'border-[#B497CF] text-[#B497CF] bg-black',
      description: 'Senior Engineer · Assigned issues, Request Inbox & PR code reviews',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'
    },
    {
      id: 'u_sam',
      username: 'sam',
      name: 'Sam Patel',
      role: 'developer',
      clearance: 'LEVEL 3 - CORE DEV',
      roleColor: 'border-[#B497CF] text-[#B497CF] bg-black',
      description: 'Core Engineer · Bug #412 author & transition state driver',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100'
    },
    {
      id: 'u_sarah',
      username: 'sarah',
      name: 'Sarah Connor',
      role: 'security',
      clearance: 'LEVEL 4 - SECURITY CORE',
      roleColor: 'border-red-500 text-red-300 bg-red-950',
      description: 'Security Officer · Confidential security group member (views Bug #413)',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100'
    },
    {
      id: 'u_chen',
      username: 'chen',
      name: 'Chen Wei',
      role: 'reporter',
      clearance: 'LEVEL 1 - REPORTER',
      roleColor: 'border-border text-muted-foreground bg-black',
      description: 'Product Reporter · Streamlined bug filing & watching without triage clutter',
      avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100'
    }
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto font-mono"
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-dialog-title"
    >
      <div
        ref={modalRef}
        className="w-full max-w-md bg-[#080808] border-2 border-foreground shadow-brutalist overflow-hidden my-8 text-foreground"
      >
        {/* Header HUD */}
        <div className="flex items-center justify-between px-4 py-2 border-b-2 border-foreground bg-[#121212] font-mono text-[10px]">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 bg-[#B497CF]" />
            <span className="h-2 w-2 bg-foreground" />
            <div>
              <h2 id="login-dialog-title" className="text-xs font-bold text-foreground tracking-wide uppercase">
                // AUTH // OPERATOR_IDENTITY & CLEARANCE
              </h2>
            </div>
          </div>
          <button
            onClick={() => setIsLoginModalOpen(false)}
            aria-label="Close login dialog"
            className="p-1 border border-border hover:border-foreground text-muted-foreground hover:text-foreground bg-[#080808]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mx-4 mt-3 p-2.5 bg-red-950 border-2 border-red-500 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-red-200 text-xs font-mono uppercase">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
            {error.toLowerCase().includes('not found') && username && (
              <button
                type="button"
                onClick={() => switchToRegisterWithUsername(username)}
                className="px-2 py-1 bg-red-800 hover:bg-red-700 text-white font-bold text-[10px] uppercase border border-red-400 shrink-0"
              >
                + REGISTER "{username}" NOW
              </button>
            )}
          </div>
        )}

        <div className="font-mono">
          {/* Credentials Form (Sign In & Register Tabs) */}
          <div className="p-5 space-y-3 bg-[#080808]">
            {/* Mode Switcher Tabs */}
            <div className="grid grid-cols-2 gap-1 border-2 border-border p-0.5 bg-[#0d0d0d]">
              <button
                type="button"
                onClick={() => { setAuthMode('login'); setError(null); }}
                className={`py-1.5 text-[10px] font-bold uppercase transition-all flex items-center justify-center gap-1.5 ${
                  authMode === 'login'
                    ? 'bg-foreground text-background shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <LogIn className="w-3 h-3" />
                <span>SIGN IN</span>
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode('register'); setError(null); }}
                className={`py-1.5 text-[10px] font-bold uppercase transition-all flex items-center justify-center gap-1.5 ${
                  authMode === 'register'
                    ? 'bg-[#B497CF] text-white shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <UserPlus className="w-3 h-3" />
                <span>NEW ACCOUNT</span>
              </button>
            </div>

            {authMode === 'login' ? (
              <form onSubmit={handleStandardLogin} className="space-y-3 pt-1">
                <div>
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                    // MANUAL OPERATOR SIGN IN
                  </h3>
                  <p className="text-[10px] text-muted-foreground mt-0.5 uppercase">
                    AUTHENTICATE WITH USERNAME AND CREDENTIALS.
                  </p>
                </div>

                <div>
                  <label className="block text-[9px] uppercase font-bold text-muted-foreground mb-1">USERNAME / EMAIL</label>
                  <div className="relative">
                    <UserIcon className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-2" />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="e.g. marcus, alex, or your handle"
                      className="w-full bg-[#0d0d0d] border-2 border-border pl-8 pr-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-foreground uppercase"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[9px] uppercase font-bold text-muted-foreground">PASSWORD</label>
                    <span className="text-[9px] text-muted-foreground">DEFAULT: password123</span>
                  </div>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-2" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full bg-[#0d0d0d] border-2 border-border pl-8 pr-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-foreground font-mono"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full brutalist-btn justify-center"
                >
                  <span className="btn-icon-block"><LogIn className="w-3.5 h-3.5" /></span>
                  <span className="btn-text-block">{isSubmitting ? 'AUTHENTICATING...' : 'AUTHENTICATE'}</span>
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegisterSubmit} className="space-y-2.5 pt-1">
                <div>
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                    // REGISTER OPERATOR ACCOUNT
                  </h3>
                  <p className="text-[10px] text-muted-foreground mt-0.5 uppercase">
                    SELF-SERVICE REGISTRATION FOR NEW OPERATOR DOSSIER.
                  </p>
                </div>

                <div>
                  <label className="block text-[9px] uppercase font-bold text-muted-foreground mb-0.5">USERNAME / HANDLE *</label>
                  <div className="relative">
                    <UserIcon className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-2" />
                    <input
                      type="text"
                      required
                      value={regUsername}
                      onChange={(e) => {
                        setRegUsername(e.target.value);
                        if (!regEmail || regEmail.endsWith('@triarc.dev')) {
                          setRegEmail(`${e.target.value.toLowerCase()}@triarc.dev`);
                        }
                      }}
                      placeholder="e.g. abh or dev_lead"
                      className="w-full bg-[#0d0d0d] border-2 border-border pl-8 pr-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-foreground uppercase font-mono"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] uppercase font-bold text-muted-foreground mb-0.5">OPERATOR DISPLAY NAME</label>
                  <input
                    type="text"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="e.g. Abhishek"
                    className="w-full bg-[#0d0d0d] border-2 border-border px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-foreground font-mono"
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label className="block text-[9px] uppercase font-bold text-muted-foreground mb-0.5">EMAIL ADDRESS *</label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-2" />
                    <input
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="e.g. abh@triarc.dev"
                      className="w-full bg-[#0d0d0d] border-2 border-border pl-8 pr-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-foreground font-mono"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] uppercase font-bold text-muted-foreground mb-0.5">PASSWORD *</label>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-2" />
                    <input
                      type="password"
                      required
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full bg-[#0d0d0d] border-2 border-border pl-8 pr-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-foreground font-mono"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2 bg-[#B497CF] hover:bg-[#c2410c] text-white font-bold text-xs uppercase flex items-center justify-center gap-1.5 transition-all shadow-sm rounded-xs mt-1"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'REGISTERING...' : 'REGISTER & ENTER'}</span>
                </button>
              </form>
            )}

            <div className="pt-2 border-t border-border text-[9px] text-muted-foreground space-y-0.5 uppercase">
              <div>🔒 BCRYPT HASHED CREDENTIALS</div>
              <div>🛡️ CRYPTOGRAPHIC JWT TOKENS</div>
            </div>
          </div>

          {/* Demo personas — a separate, collapsed section below the real form */}
          <div className="border-t-2 border-border bg-[#0d0d0d]">
            <button
              type="button"
              onClick={() => setShowPersonas((v) => !v)}
              aria-expanded={showPersonas}
              aria-controls="persona-list"
              className="w-full flex items-center gap-2 px-5 py-3 text-left hover:bg-[#131313] transition-colors focus-visible:ring-2 focus-visible:ring-[#B497CF] focus-visible:ring-inset outline-none"
            >
              <UserCheck className="w-3.5 h-3.5 text-[#B497CF] shrink-0" />
              <span className="text-[11px] font-bold text-foreground uppercase tracking-wider flex-1">
                Just exploring? Use a demo account
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform ${showPersonas ? 'rotate-180' : ''}`}
              />
            </button>

            {showPersonas && (
              <div id="persona-list" className="px-5 pb-5 space-y-2.5">
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Each persona carries different RBAC clearances, so the triage queue and
                  available actions change with the role you pick.
                </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {demoAccounts.map((acc) => (
                <button
                  key={acc.id}
                  onClick={() => handlePersonaSignIn(acc)}
                  disabled={isSubmitting}
                  className="flex flex-col text-left p-3 bg-black border-2 border-border hover:border-foreground transition-all group"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <img
                      src={acc.avatar}
                      alt={acc.name}
                      className="w-6 h-6 border border-border object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-foreground truncate uppercase group-hover:underline">
                        {acc.name}
                      </div>
                      <div className="text-[9px] text-muted-foreground font-mono">@{acc.username}</div>
                    </div>
                    <span className={`text-[8px] font-bold uppercase px-1 py-0.2 border ${acc.roleColor}`}>
                      {acc.role}
                    </span>
                  </div>
                  <p className="text-[9px] text-muted-foreground line-clamp-2 leading-relaxed uppercase">
                    {acc.description}
                  </p>
                </button>
              ))}
            </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};


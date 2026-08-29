import React, { useState } from 'react';
import { Shield, Lock, User as UserIcon, LogIn, AlertCircle, Sparkles, Check, X, KeyRound, Radio } from 'lucide-react';
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
      roleColor: 'border-[#ea580c] text-[#ea580c] bg-black',
      description: 'Senior Engineer · Assigned issues, Request Inbox & PR code reviews',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'
    },
    {
      id: 'u_sam',
      username: 'sam',
      name: 'Sam Patel',
      role: 'developer',
      clearance: 'LEVEL 3 - CORE DEV',
      roleColor: 'border-[#ea580c] text-[#ea580c] bg-black',
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
        className="w-full max-w-4xl bg-[#080808] border-2 border-foreground shadow-brutalist overflow-hidden my-8 text-foreground"
      >
        {/* Header HUD */}
        <div className="flex items-center justify-between px-4 py-2 border-b-2 border-foreground bg-[#121212] font-mono text-[10px]">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 bg-[#ea580c]" />
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
          <div className="mx-4 mt-3 p-2.5 bg-red-950 border-2 border-red-500 flex items-center gap-2 text-red-200 text-xs font-mono uppercase">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-border font-mono">
          {/* Quick Demo Persona Switcher */}
          <div className="lg:col-span-7 p-5 bg-[#0d0d0d] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Radio className="w-3.5 h-3.5 text-[#ea580c] animate-blink" />
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  // 1-CLICK PERSONA EVALUATION
                </h3>
              </div>
              <span className="text-[9px] bg-[#ea580c] text-background px-1.5 py-0.2 font-mono font-bold uppercase">
                EVALUATION MODE
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground uppercase">
              SELECT ANY OPERATOR PERSONA TO EVALUATE RBAC CLEARANCES AND CLASSIFIED DOSSIERS:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {demoAccounts.map((acc) => (
                <button
                  key={acc.id}
                  onClick={() => handleQuickSignIn(acc.id)}
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

          {/* Standard Credentials Form */}
          <div className="lg:col-span-5 p-5 space-y-3 bg-[#080808]">
            <div>
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                // MANUAL OPERATOR SIGN IN
              </h3>
              <p className="text-[10px] text-muted-foreground mt-0.5 uppercase">
                AUTHENTICATE WITH USERNAME AND CREDENTIALS.
              </p>
            </div>

            <form onSubmit={handleStandardLogin} className="space-y-3 pt-1">
              <div>
                <label className="block text-[9px] uppercase font-bold text-muted-foreground mb-1">USERNAME / EMAIL</label>
                <div className="relative">
                  <UserIcon className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-2" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. marcus or alex"
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

              <div className="pt-2 border-t border-border text-[9px] text-muted-foreground space-y-0.5 uppercase">
                <div>🔒 BCRYPT HASHED CREDENTIALS</div>
                <div>🛡️ CRYPTOGRAPHIC JWT TOKENS</div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

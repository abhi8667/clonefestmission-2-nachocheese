import React, { useState } from 'react';
import { Flag, FlagType } from '@triarc/shared-types';
import { Flag as FlagIcon, Plus, Check, X, Clock, User, AlertCircle, Loader2 } from 'lucide-react';
import { createFlag, resolveFlag } from '../../services/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';

interface FlagsPanelProps {
  bugId: number;
  flags: Flag[];
  onRefresh: () => void;
}

export const FlagsPanel: React.FC<FlagsPanelProps> = ({ bugId, flags, onRefresh }) => {
  const { currentUser, users } = useAuth();
  const [isRequesting, setIsRequesting] = useState(false);
  const [selectedType, setSelectedType] = useState('ft_review');
  const [selectedRequestee, setSelectedRequestee] = useState('u_alex');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleCreateFlag = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await createFlag(
        bugId,
        {
          type_id: selectedType,
          requestee_id: selectedRequestee || null
        },
        currentUser?.id
      );
      setIsRequesting(false);
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to request flag');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResolveFlag = async (flagId: number, status: '+' | '-') => {
    try {
      await resolveFlag(flagId, { status }, currentUser?.id);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to resolve flag');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case '?':
        return 'bg-[#ea580c] text-background font-bold animate-blink';
      case '+':
        return 'bg-emerald-600 text-black font-bold';
      case '-':
        return 'bg-red-600 text-white font-bold';
      default:
        return 'bg-black text-muted-foreground border-border';
    }
  };

  return (
    <div className="space-y-3 font-mono text-xs">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          // REQUEST & APPROVAL FLAGS
        </h4>
        <button
          onClick={() => setIsRequesting(!isRequesting)}
          className="px-2 py-0.5 border border-border hover:border-foreground text-[10px] uppercase font-bold text-foreground bg-transparent flex items-center gap-1"
        >
          <Plus className="w-3 h-3" />
          <span>REQUEST FLAG</span>
        </button>
      </div>

      {/* Request Flag Form */}
      {isRequesting && (
        <form onSubmit={handleCreateFlag} className="p-3 bg-[#0d0d0d] border-2 border-foreground/30 space-y-2.5 animate-slide-up">
          <p className="text-xs font-bold text-foreground uppercase">// CREATE NEW CLEARANCE REQUEST</p>

          {errorMsg && (
            <div className="p-2 bg-red-950 border border-red-500 text-red-200 text-[10px] uppercase">
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[9px] uppercase font-bold text-muted-foreground mb-1">FLAG TYPE:</label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full bg-black border border-border p-1.5 text-xs text-foreground uppercase focus:outline-none focus:border-foreground"
              >
                <option value="ft_review">REVIEW? (CODE REVIEW)</option>
                <option value="ft_needinfo">NEEDINFO? (ASK DETAILS)</option>
                <option value="ft_approval">APPROVAL? (RELEASE SIGN-OFF)</option>
              </select>
            </div>

            <div>
              <label className="block text-[9px] uppercase font-bold text-muted-foreground mb-1">REQUESTEE:</label>
              <select
                value={selectedRequestee}
                onChange={(e) => setSelectedRequestee(e.target.value)}
                className="w-full bg-black border border-border p-1.5 text-xs text-foreground uppercase focus:outline-none focus:border-foreground"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    @{u.username} ({u.role.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsRequesting(false)}
              className="px-2.5 py-1 text-xs uppercase text-muted-foreground hover:text-foreground"
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-3 py-1 bg-foreground text-background font-bold text-xs uppercase hover:bg-white flex items-center gap-1"
            >
              {isSubmitting && <Loader2 className="w-3 h-3 animate-spin" />}
              <span>SEND REQUEST</span>
            </button>
          </div>
        </form>
      )}

      {/* Flags List */}
      <div className="space-y-1.5">
        {flags.map((flag) => {
          const isPending = flag.status === '?';
          const canResolve = isPending && (currentUser?.id === flag.requestee_id || currentUser?.role === 'admin');

          return (
            <div
              key={flag.id}
              className="flex items-center justify-between p-2.5 bg-[#0d0d0d] border-2 border-border"
            >
              <div className="flex items-center gap-2.5">
                <span className={`w-5 h-5 flex items-center justify-center font-mono font-bold text-[10px] ${getStatusBadge(flag.status)}`}>
                  {flag.status}
                </span>

                <div>
                  <div className="flex items-center gap-1.5 font-mono text-xs">
                    <span className="font-bold text-foreground uppercase">{flag.type_name}</span>
                    <span className="text-muted-foreground uppercase text-[10px]">
                      FROM <strong className="text-foreground">@{flag.setter?.username || flag.setter_id}</strong>
                    </span>
                    {flag.requestee && (
                      <span className="text-muted-foreground uppercase text-[10px]">
                        → <strong className="text-[#ea580c]">@{flag.requestee.username}</strong>
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] text-muted-foreground uppercase font-mono">
                    REQUESTED {new Date(flag.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Inline Action for Requestee */}
              <div className="flex items-center gap-1.5">
                {canResolve ? (
                  <>
                    <button
                      onClick={() => handleResolveFlag(flag.id, '+')}
                      className="px-2 py-0.5 text-[10px] uppercase font-bold bg-foreground text-background hover:bg-white"
                    >
                      [+] GRANT
                    </button>
                    <button
                      onClick={() => handleResolveFlag(flag.id, '-')}
                      className="px-2 py-0.5 text-[10px] uppercase font-bold bg-red-950 border border-red-500 text-red-300 hover:bg-red-900"
                    >
                      [-] DENY
                    </button>
                  </>
                ) : (
                  <span className="text-[10px] font-mono text-muted-foreground uppercase">
                    {flag.status === '?' ? 'AWAITING' : `RESOLVED (${flag.status})`}
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {flags.length === 0 && (
          <div className="p-4 text-center text-muted-foreground text-xs uppercase border border-border bg-[#0d0d0d]">
            // ZERO FLAGS ATTACHED
          </div>
        )}
      </div>
    </div>
  );
};

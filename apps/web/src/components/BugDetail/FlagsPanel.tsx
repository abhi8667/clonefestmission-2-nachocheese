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
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case '+':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case '-':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      default:
        return 'bg-slate-800 text-slate-400';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <FlagIcon className="w-3.5 h-3.5 text-primary-400" />
          Request & Approval Flags
        </h4>
        <button
          onClick={() => setIsRequesting(!isRequesting)}
          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-primary-600/20 text-primary-300 border border-primary-500/30 hover:bg-primary-600/30 flex items-center gap-1 transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          Request Flag
        </button>
      </div>

      {/* Request Flag Form */}
      {isRequesting && (
        <form onSubmit={handleCreateFlag} className="p-3.5 rounded-xl bg-surface-100 border border-slate-700/80 space-y-3 animate-slide-up">
          <p className="text-xs font-bold text-white">Create New Request / Approval</p>

          {errorMsg && (
            <div className="p-2 rounded bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Flag Type:</label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full bg-surface-50 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-primary-500 font-mono"
              >
                <option value="ft_review">review? (Peer Code Review)</option>
                <option value="ft_needinfo">needinfo? (Ask for Details)</option>
                <option value="ft_approval">approval? (Release Sign-off)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Requestee (Assignee):</label>
              <select
                value={selectedRequestee}
                onChange={(e) => setSelectedRequestee(e.target.value)}
                className="w-full bg-surface-50 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-primary-500 font-sans"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} (@{u.username} - {u.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsRequesting(false)}
              className="px-3 py-1 text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-3.5 py-1 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-500 rounded-lg shadow-glow-primary flex items-center gap-1"
            >
              {isSubmitting && <Loader2 className="w-3 h-3 animate-spin" />}
              Send Request
            </button>
          </div>
        </form>
      )}

      {/* Flags List */}
      <div className="space-y-2">
        {flags.map((flag) => {
          const isPending = flag.status === '?';
          const canResolve = isPending && (currentUser?.id === flag.requestee_id || currentUser?.role === 'admin');

          return (
            <div
              key={flag.id}
              className="flex items-center justify-between p-3 rounded-xl bg-surface-100/70 border border-slate-800/80 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center font-mono font-bold text-xs border ${getStatusBadge(flag.status)}`}>
                  {flag.status}
                </span>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-200 font-mono">{flag.type_name}</span>
                    <span className="text-[11px] text-slate-400">
                      from <strong className="text-slate-300">@{flag.setter?.username || flag.setter_id}</strong>
                    </span>
                    {flag.requestee && (
                      <span className="text-[11px] text-slate-400">
                        to <strong className="text-primary-300">@{flag.requestee.username}</strong>
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">
                    Requested on {new Date(flag.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Inline Action for Requestee */}
              <div className="flex items-center gap-1.5">
                {canResolve ? (
                  <>
                    <button
                      onClick={() => handleResolveFlag(flag.id, '+')}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40 flex items-center gap-1 transition-all"
                    >
                      <Check className="w-3 h-3" /> Grant (+)
                    </button>
                    <button
                      onClick={() => handleResolveFlag(flag.id, '-')}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/40 flex items-center gap-1 transition-all"
                    >
                      <X className="w-3 h-3" /> Deny (-)
                    </button>
                  </>
                ) : (
                  <span className="text-[10px] font-mono text-slate-500">
                    {flag.status === '?' ? 'Awaiting response' : `Resolved (${flag.status})`}
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {flags.length === 0 && (
          <div className="p-6 text-center text-slate-500 text-xs italic bg-surface-50/40 rounded-xl border border-slate-800/40">
            No flags currently attached to this bug.
          </div>
        )}
      </div>
    </div>
  );
};

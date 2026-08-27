import React, { useState } from 'react';
import { Relationship, RelationshipType } from '@triarc/shared-types';
import { GitFork, Plus, Link, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { relateBug } from '../../services/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';

interface RelationshipsPanelProps {
  bugId: number;
  relationships: Relationship[];
  onRefresh: () => void;
  onSelectBug: (id: number) => void;
}

export const RelationshipsPanel: React.FC<RelationshipsPanelProps> = ({
  bugId,
  relationships,
  onRefresh,
  onSelectBug
}) => {
  const { currentUser } = useAuth();
  const [isAdding, setIsAdding] = useState(false);
  const [targetBugId, setTargetBugId] = useState('');
  const [relType, setRelType] = useState<RelationshipType>('BLOCKS');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleAddRelationship = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetBugId) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await relateBug(bugId, Number(targetBugId), relType, currentUser?.id);
      setIsAdding(false);
      setTargetBugId('');
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to link relationship');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTypeBadge = (type: RelationshipType) => {
    switch (type) {
      case 'BLOCKS': return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      case 'DEPENDS_ON': return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'DUPLICATE_OF': return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      default: return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <GitFork className="w-3.5 h-3.5 text-primary-400" />
          Bug Relationships & Dependencies
        </h4>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-primary-600/20 text-primary-300 border border-primary-500/30 hover:bg-primary-600/30 flex items-center gap-1 transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          Link Relationship
        </button>
      </div>

      {/* Add Form */}
      {isAdding && (
        <form onSubmit={handleAddRelationship} className="p-3.5 rounded-xl bg-surface-100 border border-slate-700 space-y-3 animate-slide-up">
          <p className="text-xs font-bold text-white">Create Relationship</p>

          {errorMsg && (
            <div className="p-2 rounded bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Relationship Type:</label>
              <select
                value={relType}
                onChange={(e) => setRelType(e.target.value as RelationshipType)}
                className="w-full bg-surface-50 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-primary-500 font-mono"
              >
                <option value="BLOCKS">BLOCKS (Blocks resolution of target)</option>
                <option value="DEPENDS_ON">DEPENDS_ON (Depends on target)</option>
                <option value="DUPLICATE_OF">DUPLICATE_OF (Is duplicate of target)</option>
                <option value="RELATED_TO">RELATED_TO (Related topic / reference)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Target Bug ID:</label>
              <input
                type="number"
                placeholder="e.g. 102"
                value={targetBugId}
                onChange={(e) => setTargetBugId(e.target.value)}
                className="w-full bg-surface-50 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-primary-500 font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
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
              Save Link
            </button>
          </div>
        </form>
      )}

      {/* Interactive Visual Graph Mini-Canvas */}
      {relationships.length > 0 && (
        <div className="p-4 rounded-xl bg-surface-50/80 border border-slate-800 flex items-center justify-center overflow-x-auto">
          <div className="flex items-center gap-6 py-2">
            {/* Center Node */}
            <div className="px-4 py-2.5 rounded-xl bg-primary-600/30 border-2 border-primary-500 text-center shadow-glow-primary">
              <span className="text-[10px] font-bold text-primary-300 font-mono uppercase">Current</span>
              <p className="text-xs font-bold text-white font-mono">Bug #{bugId}</p>
            </div>

            {/* Links and Targets */}
            <div className="space-y-2.5">
              {relationships.map((r) => {
                const isFromThis = r.from_bug_id === bugId;
                const otherId = isFromThis ? r.to_bug_id : r.from_bug_id;
                return (
                  <div key={r.id} className="flex items-center gap-2">
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-mono">
                      <span className={`px-1 rounded ${getTypeBadge(r.type)}`}>{r.type}</span>
                      <ArrowRight className="w-3 h-3 text-slate-500" />
                    </div>

                    <button
                      onClick={() => onSelectBug(otherId)}
                      className="px-3 py-1 rounded-lg bg-surface-100 hover:bg-surface-200 border border-slate-700 text-xs font-mono font-bold text-primary-300 hover:text-white flex items-center gap-2 transition-all"
                    >
                      <span>#{otherId}</span>
                      {r.target_bug_title && (
                        <span className="text-[11px] font-sans font-normal text-slate-300 max-w-[200px] truncate">
                          {r.target_bug_title}
                        </span>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* List */}
      <div className="space-y-2">
        {relationships.map((r) => {
          const isFromThis = r.from_bug_id === bugId;
          const otherId = isFromThis ? r.to_bug_id : r.from_bug_id;

          return (
            <div
              key={r.id}
              onClick={() => onSelectBug(otherId)}
              className="flex items-center justify-between p-3 rounded-xl bg-surface-100/70 border border-slate-800/80 hover:border-slate-700 cursor-pointer transition-all group"
            >
              <div className="flex items-center gap-3">
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${getTypeBadge(r.type)}`}>
                  {r.type}
                </span>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-primary-400">#{otherId}</span>
                    <span className="text-xs text-slate-200 group-hover:text-white font-medium">
                      {r.target_bug_title || `Linked Bug #${otherId}`}
                    </span>
                  </div>
                  {r.target_bug_status && (
                    <span className="text-[10px] font-mono text-slate-500">
                      Status: {r.target_bug_status}
                    </span>
                  )}
                </div>
              </div>

              <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-primary-400 group-hover:translate-x-1 transition-transform" />
            </div>
          );
        })}

        {relationships.length === 0 && (
          <div className="p-6 text-center text-slate-500 text-xs italic bg-surface-50/40 rounded-xl border border-slate-800/40">
            No relationships linked yet.
          </div>
        )}
      </div>
    </div>
  );
};

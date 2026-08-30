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

  return (
    <div className="space-y-3 font-mono text-xs">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          // INCIDENT RELATIONSHIPS & DEPENDENCY GRAPH
        </h4>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="px-2 py-0.5 border border-border hover:border-foreground text-[10px] uppercase font-bold text-foreground bg-transparent flex items-center gap-1"
        >
          <Plus className="w-3 h-3" />
          <span>LINK RELATIONSHIP</span>
        </button>
      </div>

      {/* Add Form */}
      {isAdding && (
        <form onSubmit={handleAddRelationship} className="p-3 bg-[#0d0d0d] border-2 border-foreground/30 space-y-2.5 animate-slide-up">
          <p className="text-xs font-bold text-foreground uppercase">// CREATE RELATIONSHIP</p>

          {errorMsg && (
            <div className="p-2 bg-red-950 border border-red-500 text-red-200 text-[10px] uppercase">
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[9px] uppercase font-bold text-muted-foreground mb-1">TYPE:</label>
              <select
                value={relType}
                onChange={(e) => setRelType(e.target.value as RelationshipType)}
                className="w-full bg-black border border-border p-1.5 text-xs text-foreground uppercase focus:outline-none focus:border-foreground"
              >
                <option value="BLOCKS">BLOCKS (BLOCKS RESOLUTION)</option>
                <option value="DEPENDS_ON">DEPENDS_ON (DEPENDS ON TARGET)</option>
                <option value="DUPLICATE_OF">DUPLICATE_OF (DUPLICATE)</option>
                <option value="RELATED_TO">RELATED_TO (REFERENCE)</option>
              </select>
            </div>

            <div>
              <label className="block text-[9px] uppercase font-bold text-muted-foreground mb-1">TARGET INCIDENT ID:</label>
              <input
                type="number"
                placeholder="e.g. 412"
                value={targetBugId}
                onChange={(e) => setTargetBugId(e.target.value)}
                className="w-full bg-black border border-border p-1.5 text-xs text-foreground uppercase focus:outline-none focus:border-foreground"
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
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
              <span>LINK</span>
            </button>
          </div>
        </form>
      )}

      {/* Relationships List */}
      <div className="space-y-1.5">
        {relationships.map((rel) => {
          const isSource = rel.from_bug_id === bugId;
          const otherId = isSource ? rel.to_bug_id : rel.from_bug_id;

          return (
            <div
              key={rel.id}
              onClick={() => onSelectBug(otherId)}
              className="flex items-center justify-between p-2.5 bg-[#0d0d0d] border-2 border-border hover:border-foreground cursor-pointer transition-all"
            >
              <div className="flex items-center gap-2">
                <span className="px-1.5 py-0.2 bg-foreground text-background text-[9px] font-bold uppercase">
                  {rel.type}
                </span>
                <span className="font-bold text-[#B497CF]">#{otherId}</span>
                <span className="text-foreground uppercase">{isSource ? `→ #${rel.to_bug_id}` : `← #${rel.from_bug_id}`}</span>
              </div>

              <div className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase">
                <span>INSPECT</span>
                <ArrowRight className="w-3 h-3" />
              </div>
            </div>
          );
        })}

        {relationships.length === 0 && (
          <div className="p-4 text-center text-muted-foreground text-xs uppercase border border-border bg-[#0d0d0d]">
            // ZERO RELATIONSHIPS RECORDED
          </div>
        )}
      </div>
    </div>
  );
};

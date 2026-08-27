import { Relationship, RelationshipType } from '@triarc/shared-types';

export function validateRelationship(
  fromBugId: number,
  toBugId: number,
  type: RelationshipType,
  existingRelationships: Relationship[] = []
): { valid: boolean; reason?: string } {
  if (fromBugId === toBugId) {
    return {
      valid: false,
      reason: `Bug #${fromBugId} cannot create a relationship with itself`
    };
  }

  const allowedTypes: RelationshipType[] = ['BLOCKS', 'DEPENDS_ON', 'DUPLICATE_OF', 'RELATED_TO'];
  if (!allowedTypes.includes(type)) {
    return {
      valid: false,
      reason: `Invalid relationship type '${type}'`
    };
  }

  // Duplicate check
  const alreadyExists = existingRelationships.some(
    (r) => r.from_bug_id === fromBugId && r.to_bug_id === toBugId && r.type === type
  );
  if (alreadyExists) {
    return {
      valid: false,
      reason: `Relationship already exists between #${fromBugId} and #${toBugId}`
    };
  }

  // Cycle check for blocking
  if (type === 'BLOCKS') {
    const reverseBlocks = existingRelationships.some(
      (r) => r.from_bug_id === toBugId && r.to_bug_id === fromBugId && r.type === 'BLOCKS'
    );
    if (reverseBlocks) {
      return {
        valid: false,
        reason: `Cannot add block: Bug #${toBugId} already blocks #${fromBugId} (circular dependency)`
      };
    }
  }

  return { valid: true };
}

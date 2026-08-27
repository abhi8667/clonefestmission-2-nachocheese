import { Relationship, RelationshipType } from '@triarc/shared-types';
export declare function validateRelationship(fromBugId: number, toBugId: number, type: RelationshipType, existingRelationships?: Relationship[]): {
    valid: boolean;
    reason?: string;
};
//# sourceMappingURL=relationships.d.ts.map
import { Flag, FlagType, UserRole } from '@triarc/shared-types';
export interface FlagValidationResult {
    valid: boolean;
    reason?: string;
}
export declare function validateFlagCreation(flagType: FlagType, setterRole: UserRole, setterId: string, requesteeId?: string | null): FlagValidationResult;
export declare function validateFlagResolution(flag: Flag, flagType: FlagType, actorId: string, actorRole: UserRole, newStatus: '+' | '-'): FlagValidationResult;
//# sourceMappingURL=flags.d.ts.map
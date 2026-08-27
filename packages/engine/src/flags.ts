import { Flag, FlagType, UserRole } from '@triarc/shared-types';

export interface FlagValidationResult {
  valid: boolean;
  reason?: string;
}

export function validateFlagCreation(
  flagType: FlagType,
  setterRole: UserRole,
  setterId: string,
  requesteeId?: string | null
): FlagValidationResult {
  if (!flagType.is_requestable) {
    return {
      valid: false,
      reason: `Flag type '${flagType.name}' is not currently requestable`
    };
  }

  // Check role authorization for requesting
  const canRequest =
    setterRole === flagType.request_role ||
    setterRole === 'admin' ||
    flagType.request_role === 'reporter';

  if (!canRequest) {
    return {
      valid: false,
      reason: `Role '${setterRole}' is not authorized to request flag of type '${flagType.name}'. Required role: ${flagType.request_role}`
    };
  }

  // If requestee is required
  if (flagType.is_requesteeble && !requesteeId && flagType.name === 'review?') {
    return {
      valid: false,
      reason: `Flag type '${flagType.name}' requires specifying a requestee`
    };
  }

  return { valid: true };
}

export function validateFlagResolution(
  flag: Flag,
  flagType: FlagType,
  actorId: string,
  actorRole: UserRole,
  newStatus: '+' | '-'
): FlagValidationResult {
  if (flag.status !== '?') {
    return {
      valid: false,
      reason: `Flag #${flag.id} has already been resolved with status '${flag.status}'`
    };
  }

  if (newStatus !== '+' && newStatus !== '-') {
    return {
      valid: false,
      reason: `Invalid resolution status '${newStatus}'. Must be '+' or '-'`
    };
  }

  // Admin can always resolve
  if (actorRole === 'admin') {
    return { valid: true };
  }

  // If a specific requestee was assigned
  if (flag.requestee_id) {
    // Setter cannot self-approve if they assigned someone else
    if (actorId === flag.setter_id && actorId !== flag.requestee_id) {
      return {
        valid: false,
        reason: `Setter cannot resolve/approve a flag assigned to another requestee`
      };
    }

    if (actorId !== flag.requestee_id) {
      return {
        valid: false,
        reason: `Only the designated requestee (user '${flag.requestee_id}') or an admin can resolve this flag`
      };
    }
  } else {
    // For unassigned flags, setter cannot self-approve
    if (actorId === flag.setter_id) {
      return {
        valid: false,
        reason: `Setter cannot self-approve open flags`
      };
    }
  }

  // Check grant role permission
  const hasGrantRole =
    actorRole === flagType.grant_role ||
    (flagType.grant_role === 'developer' && actorRole === 'triager');

  if (!hasGrantRole) {
    return {
      valid: false,
      reason: `Role '${actorRole}' is not authorized to grant/resolve flag type '${flagType.name}'. Required role: ${flagType.grant_role}`
    };
  }

  return { valid: true };
}

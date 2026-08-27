import {
  WorkflowConfig,
  WorkflowTransition,
  UserRole,
  TransitionValidationResult,
  Activity
} from '@triarc/shared-types';

export interface TransitionOptions {
  comment?: string;
  fields?: Record<string, any>;
  isAutomated?: boolean;
  actorId?: string | null;
}

export function validateTransition(
  config: WorkflowConfig,
  currentState: string,
  toState: string,
  actorRole: UserRole,
  options?: TransitionOptions
): TransitionValidationResult {
  // Check if current state exists in workflow
  if (!config.states.includes(currentState)) {
    return {
      valid: false,
      reason: `Current state '${currentState}' is not a valid workflow state`
    };
  }

  // Check if target state exists in workflow
  if (!config.states.includes(toState)) {
    return {
      valid: false,
      reason: `Target state '${toState}' is not a valid workflow state`
    };
  }

  if (currentState === toState) {
    return {
      valid: false,
      reason: `Bug is already in state '${toState}'`
    };
  }

  // Find transition definition
  const matchingTransitions = config.transitions.filter(
    (t) => (t.from === currentState || t.from === '*') && t.to === toState
  );

  if (matchingTransitions.length === 0) {
    return {
      valid: false,
      reason: `Transition from '${currentState}' to '${toState}' is not permitted in workflow graph`
    };
  }

  // Find matching transition that matches role
  const roleAllowedTransition = matchingTransitions.find(
    (t) => t.roles.includes(actorRole) || actorRole === 'admin'
  );

  if (!roleAllowedTransition) {
    const allowedRoles = Array.from(new Set(matchingTransitions.flatMap((t) => t.roles)));
    return {
      valid: false,
      reason: `Role '${actorRole}' is not authorized to transition from '${currentState}' to '${toState}'. Allowed roles: ${allowedRoles.join(', ')}`
    };
  }

  const transition = roleAllowedTransition;

  // If automated transition, check if automatable is true
  if (options?.isAutomated && !transition.automatable) {
    return {
      valid: false,
      reason: `Transition from '${currentState}' to '${toState}' is not configured for automated execution`
    };
  }

  // Validate guards
  if (transition.guards) {
    if (transition.guards.requireComment) {
      const comment = options?.comment?.trim();
      if (!comment) {
        return {
          valid: false,
          reason: `Guard failed: Transition to '${toState}' requires a comment`,
          transition
        };
      }
    }

    if (transition.guards.requireFields && transition.guards.requireFields.length > 0) {
      const missingFields: string[] = [];
      const fields = options?.fields || {};
      for (const field of transition.guards.requireFields) {
        const val = fields[field];
        if (val === undefined || val === null || val === '') {
          missingFields.push(field);
        }
      }

      if (missingFields.length > 0) {
        return {
          valid: false,
          reason: `Guard failed: Missing required field(s): ${missingFields.join(', ')}`,
          transition
        };
      }
    }
  }

  return {
    valid: true,
    transition
  };
}

export function getAvailableTransitions(
  config: WorkflowConfig,
  currentState: string,
  actorRole: UserRole
): WorkflowTransition[] {
  return config.transitions.filter((t) => {
    const fromMatches = t.from === currentState || t.from === '*';
    const notSelf = t.to !== currentState;
    const roleMatches = t.roles.includes(actorRole) || actorRole === 'admin';
    return fromMatches && notSelf && roleMatches;
  });
}

export function createTransitionActivity(
  bugId: number,
  oldState: string,
  newState: string,
  actorId: string | null,
  isAutomated: boolean = false
): Omit<Activity, 'id' | 'created_at'> {
  return {
    bug_id: bugId,
    actor_id: actorId,
    field: 'status',
    old_value: oldState,
    new_value: newState,
    automated: isAutomated
  };
}

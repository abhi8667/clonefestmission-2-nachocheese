import { WorkflowConfig, WorkflowTransition, UserRole, TransitionValidationResult, Activity } from '@triarc/shared-types';
export interface TransitionOptions {
    comment?: string;
    fields?: Record<string, any>;
    isAutomated?: boolean;
    actorId?: string | null;
}
export declare function validateTransition(config: WorkflowConfig, currentState: string, toState: string, actorRole: UserRole, options?: TransitionOptions): TransitionValidationResult;
export declare function getAvailableTransitions(config: WorkflowConfig, currentState: string, actorRole: UserRole): WorkflowTransition[];
export declare function createTransitionActivity(bugId: number, oldState: string, newState: string, actorId: string | null, isAutomated?: boolean): Omit<Activity, 'id' | 'created_at'>;
//# sourceMappingURL=workflow.d.ts.map
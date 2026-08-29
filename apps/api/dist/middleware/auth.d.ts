import { Request, Response, NextFunction } from 'express';
import { User, UserRole } from '@triarc/shared-types';
export interface AuthenticatedRequest extends Request {
    user?: User;
}
export declare function isDemoModeEnabled(): boolean;
export declare function generateToken(user: User): string;
export declare function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void | Response<any, Record<string, any>>;
export declare function requireRole(roles: UserRole[]): (req: AuthenticatedRequest, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>;
//# sourceMappingURL=auth.d.ts.map
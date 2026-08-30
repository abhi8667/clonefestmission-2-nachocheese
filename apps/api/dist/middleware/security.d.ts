import { User } from '@triarc/shared-types';
export declare function canUserViewBug(user: User | undefined, bugId: number): boolean;
export declare function getSecurityFilterSQL(user: User | undefined, tableAlias?: string): {
    sql: string;
    params: any[];
};
export declare function requireBugAccess(paramName?: string): (req: any, res: any, next: any) => any;
//# sourceMappingURL=security.d.ts.map
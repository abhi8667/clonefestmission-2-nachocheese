import { User } from '@triarc/shared-types';
export declare function canUserViewBug(user: User | undefined, bugId: number): boolean;
export declare function getSecurityFilterSQL(user: User | undefined): {
    sql: string;
    params: any[];
};
//# sourceMappingURL=security.d.ts.map
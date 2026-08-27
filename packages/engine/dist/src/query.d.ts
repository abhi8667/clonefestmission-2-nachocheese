export interface QueryFilter {
    statuses?: string[];
    priorities?: string[];
    severities?: string[];
    components?: string[];
    assignees?: string[];
    reporters?: string[];
    changedTo?: string;
    changedBy?: string;
    changedAfter?: string;
    text?: string[];
    raw: string;
}
export declare function parseSearchQuery(queryStr: string): QueryFilter;
//# sourceMappingURL=query.d.ts.map
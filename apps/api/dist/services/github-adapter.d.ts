import { GitHubEvent } from '@triarc/shared-types';
export declare function verifyGitHubSignature(payload: string | Buffer, signatureHeader: string | undefined): boolean;
export declare function parseBugIdsFromText(text: string): number[];
export declare function processGitHubEvent(event: GitHubEvent): {
    success: boolean;
    actions: string[];
    bugIds: number[];
};
//# sourceMappingURL=github-adapter.d.ts.map
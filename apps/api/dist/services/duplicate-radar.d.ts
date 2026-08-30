import { DuplicateMatch, User } from '@triarc/shared-types';
export declare function clearVectorCache(): void;
export declare function generateEmbedding(text: string): number[];
export declare function cosineSimilarity(vecA: number[], vecB: number[]): number;
export declare function indexBugEmbedding(bugId: number, title: string, description: string): void;
export declare function findDuplicates(title: string, description?: string, excludeBugId?: number, currentUser?: User, limit?: number, minScore?: number): DuplicateMatch[];
//# sourceMappingURL=duplicate-radar.d.ts.map
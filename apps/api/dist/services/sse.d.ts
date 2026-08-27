import { Response } from 'express';
import { SSEEventType, User } from '@triarc/shared-types';
declare class SSEService {
    private clients;
    private presence;
    private cleanupTimer;
    constructor();
    registerClient(id: string, res: Response, userId?: string): void;
    broadcast(type: SSEEventType, data: any): void;
    heartbeat(bugId: number, user: User): void;
    private broadcastPresence;
    getViewers(bugId: number): {
        user_id: string;
        username: string;
        name: string;
        last_seen: string;
    }[];
    private cleanupPresence;
    private sendToClient;
}
export declare const sseService: SSEService;
export {};
//# sourceMappingURL=sse.d.ts.map
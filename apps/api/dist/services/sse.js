class SSEService {
    clients = new Map();
    // bugId -> Map<userId, PresenceViewer>
    presence = new Map();
    cleanupTimer = null;
    constructor() {
        // Periodically clean up stale presence viewers (> 25 seconds without heartbeat)
        this.cleanupTimer = setInterval(() => {
            this.cleanupPresence();
        }, 10000);
    }
    registerClient(id, res, userId) {
        this.clients.set(id, { id, res, userId });
        // Send initial connected event
        this.sendToClient(res, {
            type: 'presence:changed',
            data: { message: 'Connected to Triarc live stream' },
            timestamp: new Date().toISOString()
        });
        res.on('close', () => {
            this.clients.delete(id);
        });
    }
    broadcast(type, data) {
        const message = {
            type,
            data,
            timestamp: new Date().toISOString()
        };
        const payload = `data: ${JSON.stringify(message)}\n\n`;
        for (const [_, client] of this.clients) {
            try {
                client.res.write(payload);
            }
            catch (err) {
                // Handle disconnected client
            }
        }
    }
    heartbeat(bugId, user) {
        if (!this.presence.has(bugId)) {
            this.presence.set(bugId, new Map());
        }
        const bugViewers = this.presence.get(bugId);
        bugViewers.set(user.id, {
            userId: user.id,
            username: user.username,
            name: user.name,
            lastSeen: Date.now()
        });
        this.broadcastPresence(bugId);
    }
    broadcastPresence(bugId) {
        const viewers = this.getViewers(bugId);
        this.broadcast('presence:changed', {
            bug_id: bugId,
            active_viewers: viewers
        });
    }
    getViewers(bugId) {
        const bugViewers = this.presence.get(bugId);
        if (!bugViewers)
            return [];
        const now = Date.now();
        const active = [];
        for (const [_, viewer] of bugViewers) {
            if (now - viewer.lastSeen < 25000) {
                active.push({
                    user_id: viewer.userId,
                    username: viewer.username,
                    name: viewer.name,
                    last_seen: new Date(viewer.lastSeen).toISOString()
                });
            }
        }
        return active;
    }
    cleanupPresence() {
        const now = Date.now();
        for (const [bugId, bugViewers] of this.presence.entries()) {
            let changed = false;
            for (const [userId, viewer] of bugViewers.entries()) {
                if (now - viewer.lastSeen >= 25000) {
                    bugViewers.delete(userId);
                    changed = true;
                }
            }
            if (changed) {
                this.broadcastPresence(bugId);
            }
        }
    }
    sendToClient(res, message) {
        try {
            res.write(`data: ${JSON.stringify(message)}\n\n`);
        }
        catch (err) {
            // Ignored
        }
    }
}
export const sseService = new SSEService();
//# sourceMappingURL=sse.js.map
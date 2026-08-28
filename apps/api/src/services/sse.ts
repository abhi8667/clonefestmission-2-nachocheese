import { Response } from 'express';
import { SSEEventType, SSEMessage, User } from '@triarc/shared-types';
import { db } from '../db/database.js';

interface SSEClient {
  id: string;
  res: Response;
  userId?: string;
}

interface PresenceViewer {
  userId: string;
  username: string;
  name: string;
  lastSeen: number;
}

class SSEService {
  private clients: Map<string, SSEClient> = new Map();
  // bugId -> Map<userId, PresenceViewer>
  private presence: Map<number, Map<string, PresenceViewer>> = new Map();
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor() {
    // Periodically clean up stale presence viewers (> 25 seconds without heartbeat)
    this.cleanupTimer = setInterval(() => {
      this.cleanupPresence();
    }, 10000);
    if (this.cleanupTimer && typeof this.cleanupTimer.unref === 'function') {
      this.cleanupTimer.unref();
    }
  }

  public registerClient(id: string, res: Response, userId?: string) {
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

  public broadcast(type: SSEEventType, data: any) {
    const message: SSEMessage = {
      type,
      data,
      timestamp: new Date().toISOString()
    };

    const payload = `data: ${JSON.stringify(message)}\n\n`;

    for (const [_, client] of this.clients) {
      try {
        client.res.write(payload);
      } catch (err) {
        // Handle disconnected client
      }
    }
  }

  public heartbeat(bugId: number, user: User) {
    if (!this.presence.has(bugId)) {
      this.presence.set(bugId, new Map());
    }

    const bugViewers = this.presence.get(bugId)!;
    bugViewers.set(user.id, {
      userId: user.id,
      username: user.username,
      name: user.name,
      lastSeen: Date.now()
    });

    this.broadcastPresence(bugId);
  }

  private broadcastPresence(bugId: number) {
    const viewers = this.getViewers(bugId);
    this.broadcast('presence:changed', {
      bug_id: bugId,
      active_viewers: viewers
    });
  }

  public getViewers(bugId: number) {
    const bugViewers = this.presence.get(bugId);
    if (!bugViewers) return [];

    const now = Date.now();
    const active: { user_id: string; username: string; name: string; last_seen: string }[] = [];

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

  private cleanupPresence() {
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

  private sendToClient(res: Response, message: SSEMessage) {
    try {
      res.write(`data: ${JSON.stringify(message)}\n\n`);
    } catch (err) {
      // Ignored
    }
  }
}

export const sseService = new SSEService();

import { Router } from 'express';
import { sseService } from '../services/sse.js';
export const streamRouter = Router();
// GET /api/stream - Server-Sent Events stream for live field updates & presence
streamRouter.get('/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders();
    const clientId = Math.random().toString(36).substring(2, 12);
    const userId = req.query.userId;
    sseService.registerClient(clientId, res, userId);
});
// POST /api/presence/heartbeat - Heartbeat sent every ~10s while bug detail is open
streamRouter.post('/presence/heartbeat', (req, res) => {
    const { bugId } = req.body;
    if (!bugId || !req.user) {
        return res.status(400).json({ error: 'bugId and authenticated user required' });
    }
    sseService.heartbeat(Number(bugId), req.user);
    const viewers = sseService.getViewers(Number(bugId));
    res.json({ success: true, viewers });
});
//# sourceMappingURL=stream.js.map
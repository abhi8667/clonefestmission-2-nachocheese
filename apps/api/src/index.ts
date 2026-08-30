import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { initializeDatabase } from './db/schema.js';

import { db } from './db/database.js';
import { authRouter } from './routes/auth.js';
import { bugsRouter } from './routes/bugs.js';
import { flagsRouter } from './routes/flags.js';
import { analyticsRouter } from './routes/analytics.js';
import { webhooksRouter } from './routes/webhooks.js';
import { streamRouter } from './routes/stream.js';
import { savedSearchesRouter } from './routes/saved-searches.js';
import { notificationsRouter } from './routes/notifications.js';
import { adminRouter } from './routes/admin.js';
import { importRouter } from './routes/import.js';
import { projectsRouter } from './routes/projects.js';
import { githubRouter } from './routes/github.js';
import { authMiddleware } from './middleware/auth.js';
import { createRateLimiter } from './middleware/rate-limit.js';
import { runSeed } from './scripts/seed.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Finding 10: Explicit CORS origin allowlist defaulting to dev vite port
const allowedOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? allowedOrigin : true,
  credentials: true
}));

// Finding 05: Capture authentic raw payload Buffer for cryptographic HMAC webhook validation
app.use(express.json({
  limit: '10mb',
  verify: (req: any, _res, buf) => {
    req.rawBody = buf;
  }
}));

// Global API rate limiter
app.use('/api', createRateLimiter({ max: 1000, windowMs: 15 * 60 * 1000 }));

// Finding 09: Dedicated rate limiter for credential endpoints (15 attempts / 15 min), keyed on IP and username
const authLimiter = createRateLimiter({
  max: 15,
  windowMs: 15 * 60 * 1000,
  keyGenerator: (req) => {
    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
    const username = req.body?.username ? String(req.body.username).trim().toLowerCase() : '';
    return username ? `${ip}:${username}` : ip;
  }
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Initialize database schema
initializeDatabase();

// Auto-seed if database has no bugs
const bugCount = db.prepare('SELECT COUNT(*) as count FROM bugs').get() as { count: number };
if (bugCount.count === 0) {
  console.log('Database empty, auto-seeding sample dataset...');
  runSeed();
}

// Health check
app.get(['/health', '/api/health'], (req, res) => {
  res.json({ status: 'ok', service: 'triarc-api', timestamp: new Date().toISOString() });
});

// OpenAPI schema stub per Phase 0 contract
app.get('/api/openapi.json', (req, res) => {
  res.json({
    openapi: '3.0.0',
    info: { title: 'Triarc API', version: '1.0.0', description: 'Flow-first bug tracker REST API' },
    paths: {
      '/api/projects': { get: { summary: 'List projects' }, post: { summary: 'Create project' } },
      '/api/projects/attention': { get: { summary: 'Get attention summary counts' } },
      '/api/projects/{key}': { get: { summary: 'Get project details' } },
      '/api/bugs': { get: { summary: 'List bugs' }, post: { summary: 'Create bug' } },
      '/api/bugs/{id}': { get: { summary: 'Get bug details' } },
      '/api/bugs/{id}/transition': { patch: { summary: 'Transition bug status' } },
      '/api/bugs/{id}/relate': { post: { summary: 'Add bug relationship' } },
      '/api/bugs/{id}/comments': { post: { summary: 'Add comment' } },
      '/api/bugs/{id}/duplicates': { get: { summary: 'Get live duplicates' } },
      '/api/bugs/{id}/timeline': { get: { summary: 'Get unified timeline' } },
      '/api/bugs/{id}/flags': { post: { summary: 'Create request flag' } },
      '/api/flags/{id}': { patch: { summary: 'Resolve request flag' } },
      '/api/inbox': { get: { summary: 'Get Request Inbox' } },
      '/api/analytics/flow': { get: { summary: 'Get cumulative flow analytics' } },
      '/api/admin/users': { get: { summary: 'Admin users management' } },
      '/api/import/github': { post: { summary: 'Import GitHub repository' } },
      '/api/webhooks/github': { post: { summary: 'GitHub webhook ingest' } },
      '/api/stream': { get: { summary: 'Server-Sent Events stream' } }
    }
  });
});

// Mount public routes
app.use('/api/auth', authRouter);
app.use('/api', authRouter); // /api/users
app.use('/api/webhooks', webhooksRouter);
app.use('/api', streamRouter);

// Protected routes
app.use('/api/projects', authMiddleware, projectsRouter);
app.use('/api', authMiddleware, bugsRouter);
app.use('/api', authMiddleware, flagsRouter);
app.use('/api', authMiddleware, analyticsRouter);
app.use('/api', authMiddleware, savedSearchesRouter);
app.use('/api', authMiddleware, notificationsRouter);
app.use('/api/admin', authMiddleware, adminRouter);
app.use('/api/import', authMiddleware, importRouter);
// GitHub account linking. The OAuth callback inside handles its own auth via
// the `state` it minted, so the router is mounted without authMiddleware.
app.use('/api/github', githubRouter);

// Serve static web app bundle if built dist folder exists (e.g. all-in-one container)
const staticDistCandidates = [
  process.env.STATIC_DIST_PATH,
  path.resolve(process.cwd(), '../web/dist'),
  path.resolve(process.cwd(), 'apps/web/dist'),
  path.resolve(process.cwd(), 'public')
].filter(Boolean) as string[];

for (const candidatePath of staticDistCandidates) {
  if (fs.existsSync(candidatePath)) {
    app.use(express.static(candidatePath));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) return next();
      res.sendFile(path.join(candidatePath, 'index.html'));
    });
    break;
  }
}

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('API Error:', err);
  const status = typeof err.status === 'number' ? err.status : 500;
  res.status(status).json({
    error: err.message || 'Internal server error',
    code: err.code || (status === 500 ? 'INTERNAL_SERVER_ERROR' : 'API_ERROR'),
    ...(err.details ? { details: err.details } : {})
  });
});

const isDirectEntry = process.argv[1] && (process.argv[1].endsWith('index.ts') || process.argv[1].endsWith('index.js'));
if (isDirectEntry && process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🚀 Triarc API listening on http://localhost:${PORT}`);
    console.log(`📡 SSE Stream active on http://localhost:${PORT}/api/stream`);
  });
}

export default app;

import express from 'express';
import cors from 'cors';
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
import { authMiddleware } from './middleware/auth.js';
import { createRateLimiter } from './middleware/rate-limit.js';
import { runSeed } from './scripts/seed.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/api', createRateLimiter({ max: 1000, windowMs: 15 * 60 * 1000 }));

// Initialize database schema
initializeDatabase();

// Auto-seed if database has no bugs
const bugCount = db.prepare('SELECT COUNT(*) as count FROM bugs').get() as { count: number };
if (bugCount.count === 0) {
  console.log('Database empty, auto-seeding sample dataset...');
  runSeed();
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'triarc-api', timestamp: new Date().toISOString() });
});

// OpenAPI schema stub per Phase 0 contract
app.get('/api/openapi.json', (req, res) => {
  res.json({
    openapi: '3.0.0',
    info: { title: 'Triarc API', version: '1.0.0', description: 'Flow-first bug tracker REST API' },
    paths: {
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
      '/api/webhooks/github': { post: { summary: 'GitHub webhook ingest' } },
      '/api/stream': { get: { summary: 'Server-Sent Events stream' } }
    }
  });
});

// Mount routes
app.use('/api/auth', authRouter);
app.use('/api', authRouter); // /api/users
app.use('/api/webhooks', webhooksRouter);
app.use('/api', streamRouter);

// Protected routes (with fallback for easy demo mode)
app.use('/api', authMiddleware, bugsRouter);
app.use('/api', authMiddleware, flagsRouter);
app.use('/api', authMiddleware, analyticsRouter);
app.use('/api', authMiddleware, savedSearchesRouter);
app.use('/api', authMiddleware, notificationsRouter);

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

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🚀 Triarc API listening on http://localhost:${PORT}`);
    console.log(`📡 SSE Stream active on http://localhost:${PORT}/api/stream`);
  });
}

export default app;

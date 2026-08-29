import { Router, Response } from 'express';
import { db } from '../db/database.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { importGitHubRepository } from '../services/github-importer.js';

export const importRouter = Router();

// GET /api/import/history - List imported repositories
importRouter.get('/history', (req: AuthenticatedRequest, res: Response) => {
  const repos = db.prepare('SELECT * FROM imported_repos ORDER BY imported_at DESC').all();
  res.json({ imported_repos: repos });
});

// GET /api/import/fixtures - List available offline demo fixtures
importRouter.get('/fixtures', (req: AuthenticatedRequest, res: Response) => {
  res.json({
    fixtures: [
      {
        key: 'facebook/react',
        name: 'facebook/react',
        description: 'React Concurrent & Server Components issue tracker',
        issues_count: 5,
        default: true
      },
      {
        key: 'expressjs/express',
        name: 'expressjs/express',
        description: 'Express.js Routing & Middleware issue tracker',
        issues_count: 2,
        default: false
      }
    ]
  });
});

// POST /api/import/github - Import a GitHub repository
importRouter.post('/github', async (req: AuthenticatedRequest, res: Response) => {
  const { repoUrl, maxIssues = 50, githubToken, useFixture = false, fixtureName } = req.body || {};

  if (!repoUrl && !useFixture) {
    return res.status(400).json({ error: 'repoUrl is required', code: 'INVALID_INPUT' });
  }

  const jobId = `job_${Date.now()}`;

  try {
    const result = await importGitHubRepository({
      repoUrl: repoUrl || 'https://github.com/facebook/react',
      maxIssues: Number(maxIssues) || 50,
      githubToken,
      useFixture,
      fixtureName,
      jobId
    });

    res.json({
      job_id: jobId,
      ...result
    });
  } catch (err: any) {
    console.error('GitHub Import Error:', err);
    res.status(500).json({
      error: err.message || 'Failed to import GitHub repository',
      code: 'IMPORT_ERROR'
    });
  }
});

// POST /api/import/fixture - Instant offline fixture import
importRouter.post('/fixture', async (req: AuthenticatedRequest, res: Response) => {
  const { fixtureName = 'facebook/react' } = req.body || {};
  const jobId = `fixture_${Date.now()}`;

  try {
    const result = await importGitHubRepository({
      repoUrl: `https://github.com/${fixtureName}`,
      useFixture: true,
      fixtureName,
      jobId
    });

    res.json({
      job_id: jobId,
      ...result
    });
  } catch (err: any) {
    res.status(500).json({
      error: err.message || 'Failed to import fixture',
      code: 'FIXTURE_IMPORT_ERROR'
    });
  }
});

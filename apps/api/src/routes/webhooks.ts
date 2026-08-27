import { Router, Request, Response } from 'express';
import { verifyGitHubSignature, processGitHubEvent } from '../services/github-adapter.js';
import { GitHubEvent } from '@triarc/shared-types';

export const webhooksRouter = Router();

// POST /api/webhooks/github - Real webhook receiver with signature validation
webhooksRouter.post('/webhooks/github', (req: Request, res: Response) => {
  const signature = req.headers['x-hub-signature-256'] as string | undefined;
  const eventName = req.headers['x-github-event'] as string || 'push';

  const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
  if (!verifyGitHubSignature(rawBody, signature)) {
    return res.status(401).json({ error: 'Invalid webhook signature' });
  }

  const payload = req.body;
  const results: any[] = [];

  if (eventName === 'push') {
    const commits = payload.commits || [];
    for (const c of commits) {
      const event: GitHubEvent = {
        kind: 'commit',
        commit_hash: c.id,
        commit_message: c.message,
        author: c.author?.name || c.author?.username || 'developer',
        url: c.url
      };
      results.push(processGitHubEvent(event));
    }
  } else if (eventName === 'pull_request') {
    const pr = payload.pull_request;
    const action = payload.action;
    if (pr) {
      const event: GitHubEvent = {
        kind: 'pull_request',
        action,
        pr_number: pr.number,
        pr_title: pr.title,
        pr_state: pr.merged ? 'merged' : pr.state,
        ref: pr.head?.ref || '',
        author: pr.user?.login || 'developer',
        url: pr.html_url
      };
      results.push(processGitHubEvent(event));
    }
  } else if (eventName === 'pull_request_review') {
    const pr = payload.pull_request;
    const review = payload.review;
    if (pr && review) {
      const event: GitHubEvent = {
        kind: 'pull_request_review',
        action: 'submitted',
        pr_number: pr.number,
        pr_title: pr.title,
        review_state: review.state === 'approved' ? 'approved' : 'changes_requested',
        ref: pr.head?.ref || '',
        author: review.user?.login || 'reviewer',
        url: review.html_url
      };
      results.push(processGitHubEvent(event));
    }
  }

  res.json({
    received: true,
    processed: results.length,
    results
  });
});

// POST /api/webhooks/simulate - UI simulator helper for testing & demo presentation
webhooksRouter.post('/webhooks/simulate', (req: Request, res: Response) => {
  const { type, bugId, message, author = 'alex', prNumber = 42, branchName } = req.body;

  if (!type || !bugId) {
    return res.status(400).json({ error: 'type and bugId are required' });
  }

  let event: GitHubEvent;
  const hash = Math.random().toString(36).substring(2, 9);

  if (type === 'commit') {
    const commitMsg = message || `Fixes #${bugId}: resolve memory leak in worker thread`;
    event = {
      kind: 'commit',
      commit_hash: hash,
      commit_message: commitMsg,
      author,
      url: `https://github.com/triarc/core/commit/${hash}`
    };
  } else if (type === 'pr_open') {
    const title = message || `Fix issue with save operation (refs #${bugId})`;
    event = {
      kind: 'pull_request',
      action: 'opened',
      pr_number: prNumber,
      pr_title: title,
      pr_state: 'open',
      ref: branchName || `fix/bug-${bugId}`,
      author,
      url: `https://github.com/triarc/core/pull/${prNumber}`
    };
  } else if (type === 'pr_review') {
    event = {
      kind: 'pull_request_review',
      action: 'submitted',
      pr_number: prNumber,
      pr_title: `Fix for bug #${bugId}`,
      review_state: 'approved',
      ref: branchName || `fix/bug-${bugId}`,
      author,
      url: `https://github.com/triarc/core/pull/${prNumber}#pullrequestreview-1`
    };
  } else if (type === 'pr_merge') {
    event = {
      kind: 'pull_request',
      action: 'closed',
      pr_number: prNumber,
      pr_title: `Fix for bug #${bugId}`,
      pr_state: 'merged',
      ref: branchName || `fix/bug-${bugId}`,
      author,
      url: `https://github.com/triarc/core/pull/${prNumber}`
    };
  } else {
    return res.status(400).json({ error: `Unknown simulation type '${type}'` });
  }

  const result = processGitHubEvent(event);
  res.json({
    simulated: true,
    event,
    result
  });
});

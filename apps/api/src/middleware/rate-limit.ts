import { Request, Response, NextFunction } from 'express';

interface RateLimitOptions {
  windowMs?: number;
  max?: number;
  message?: string;
}

interface ClientRecord {
  count: number;
  resetTime: number;
}

export function createRateLimiter(options: RateLimitOptions = {}) {
  const windowMs = options.windowMs || 15 * 60 * 1000; // 15 minutes
  const max = options.max || 1000; // 1000 requests per window
  const message = options.message || 'Too many requests from this IP, please try again later.';

  const hits = new Map<string, ClientRecord>();

  // Periodically clean up expired entries every 5 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of hits.entries()) {
      if (now > record.resetTime) {
        hits.delete(ip);
      }
    }
  }, 5 * 60 * 1000).unref();

  return (req: Request, res: Response, next: NextFunction) => {
    // Skip SSE stream and health check from rate limiting
    if (req.path === '/api/stream' || req.path === '/health' || req.path === '/stream') {
      return next();
    }

    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
    const now = Date.now();

    let record = hits.get(ip);
    if (!record || now > record.resetTime) {
      record = { count: 1, resetTime: now + windowMs };
      hits.set(ip, record);
    } else {
      record.count++;
    }

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - record.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000));

    if (record.count > max) {
      return res.status(429).json({
        error: message,
        code: 'RATE_LIMIT_EXCEEDED',
        details: { retryAfterSeconds: Math.ceil((record.resetTime - now) / 1000) }
      });
    }

    next();
  };
}

import { BugStatus, DuplicateMatch, User } from '@triarc/shared-types';
import { db } from '../db/database.js';
import { canUserViewBug } from '../middleware/security.js';

// Deterministic semantic feature extraction & embedding generator (384 dimensions)
export function generateEmbedding(text: string): number[] {
  const dim = 384;
  const vector = new Array(dim).fill(0);
  const normalized = text.toLowerCase().replace(/[^a-z0-9\s_-]/g, ' ');
  const tokens = normalized.split(/\s+/).filter(Boolean);

  if (tokens.length === 0) return vector;

  // Character n-grams and word tokens mapped into fixed dimensional space with hashing trick
  for (let i = 0; i < tokens.length; i++) {
    const word = tokens[i];
    const hash = simpleHash(word);
    const index = Math.abs(hash) % dim;
    const sign = (hash & 1) === 0 ? 1 : -1;
    vector[index] += sign * (1 + Math.log(1 + 1 / (i + 1)));

    // Bi-grams
    if (i < tokens.length - 1) {
      const bigram = `${word}_${tokens[i + 1]}`;
      const biHash = simpleHash(bigram);
      const biIndex = Math.abs(biHash) % dim;
      vector[biIndex] += 1.5;
    }
  }

  // Normalize to unit length (L2 norm)
  let sumSq = 0;
  for (let v of vector) sumSq += v * v;
  const magnitude = Math.sqrt(sumSq);

  if (magnitude > 0) {
    for (let i = 0; i < dim; i++) {
      vector[i] /= magnitude;
    }
  }

  return vector;
}

function simpleHash(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return hash;
}

export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length || vecA.length === 0) return 0;
  let dotProduct = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
  }
  return Math.max(0, Math.min(1, dotProduct));
}

export function indexBugEmbedding(bugId: number, title: string, description: string) {
  const vector = generateEmbedding(`${title} ${description}`);
  const json = JSON.stringify(vector);
  db.prepare(`
    INSERT INTO bug_embeddings (bug_id, vector_json)
    VALUES (?, ?)
    ON CONFLICT(bug_id) DO UPDATE SET vector_json = excluded.vector_json
  `).run(bugId, json);
}

export function findDuplicates(
  title: string,
  description: string = '',
  excludeBugId?: number,
  currentUser?: User,
  limit: number = 5,
  minScore: number = 0.45
): DuplicateMatch[] {
  const queryVector = generateEmbedding(`${title} ${description}`);

  const rows = db.prepare(`
    SELECT b.id, b.title, b.status, b.security_group_id, e.vector_json
    FROM bugs b
    JOIN bug_embeddings e ON b.id = e.bug_id
    WHERE (? IS NULL OR b.id != ?)
  `).all(excludeBugId || null, excludeBugId || null) as {
    id: number;
    title: string;
    status: BugStatus;
    security_group_id: string | null;
    vector_json: string;
  }[];

  const matches: DuplicateMatch[] = [];

  for (const row of rows) {
    if (!canUserViewBug(currentUser, row.id)) {
      continue;
    }

    try {
      const bugVector = JSON.parse(row.vector_json) as number[];
      const score = cosineSimilarity(queryVector, bugVector);

      if (score >= minScore) {
        matches.push({
          bug_id: row.id,
          title: row.title,
          status: row.status,
          similarity_score: Math.round(score * 100) / 100
        });
      }
    } catch (err) {
      // Ignore parse error
    }
  }

  // Sort descending by similarity score
  matches.sort((a, b) => b.similarity_score - a.similarity_score);
  return matches.slice(0, limit);
}

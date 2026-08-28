import { db } from '../db/database.js';
import { canUserViewBug } from '../middleware/security.js';
// Domain semantic synonym expansion dictionary for software engineering issue tracking
const SYNONYM_CLUSTERS = {
    crash: ['exception', 'panic', 'segfault', 'nullpointer', 'npe', 'fatal', 'fault', 'crashed', 'abort', 'freeze', 'failure'],
    save: ['persist', 'write', 'store', 'flush', 'commit', 'saved', 'persisting', 'writing', 'saving'],
    offline: ['disconnected', 'network', 'wifi', 'airplane', 'no-internet', 'sync', 'connectivity', 'local', 'disconnection'],
    login: ['auth', 'authenticate', 'signin', 'sign-in', 'session', 'jwt', 'credentials', 'oauth', 'token', '401', 'unauthorized'],
    memory: ['leak', 'heap', 'oom', 'garbage-collection', 'gc', 'allocation', 'ram', 'buffer'],
    slow: ['latency', 'delay', 'lag', 'performance', 'timeout', 'sluggish', 'hang', 'spinning', 'perf'],
    button: ['click', 'ui', 'component', 'cta', 'tap', 'press', 'interactive'],
    dropdown: ['select', 'picker', 'menu', 'options', 'combobox'],
    duplicate: ['dupe', 'repeat', 'identical', 'clone', 'matching', 'replicate'],
    security: ['confidential', 'vulnerability', 'cve', 'exploit', 'injection', 'xss', 'csrf', 'privilege'],
    render: ['display', 'paint', 'draw', 'flicker', 'blank', 'layout', 'css', 'styled', 'visual'],
    transition: ['workflow', 'status', 'guard', 'stage', 'state-machine', 'lifecycle'],
    permission: ['role', 'forbidden', '403', 'rbac', 'access', 'denied', 'unauthorized', 'restricted'],
    notification: ['toast', 'alert', 'banner', 'digest', 'email', 'inbox', 'sse', 'push'],
    database: ['sqlite', 'postgres', 'query', 'table', 'migration', 'sql', 'foreign-key', 'db']
};
// Build fast reverse lookup
const TERM_TO_CLUSTER = new Map();
for (const [canonical, syns] of Object.entries(SYNONYM_CLUSTERS)) {
    const allTerms = [canonical, ...syns];
    for (const term of allTerms) {
        TERM_TO_CLUSTER.set(term, allTerms);
    }
}
// 384-dimensional semantic embedding generator
export function generateEmbedding(text) {
    const dim = 384;
    const vector = new Array(dim).fill(0);
    const normalized = text.toLowerCase().replace(/[^a-z0-9\s_-]/g, ' ');
    const rawTokens = normalized.split(/\s+/).filter(Boolean);
    if (rawTokens.length === 0)
        return vector;
    // Expand tokens with semantic concepts & synonyms
    const expandedTokens = [];
    for (let i = 0; i < rawTokens.length; i++) {
        const raw = rawTokens[i];
        // Base token
        expandedTokens.push({ token: raw, weight: 2.0 });
        // Stem variations (e.g. crashing -> crash, saved -> save, queries -> query)
        const stem = raw.replace(/(ing|ed|es|s|er|ly)$/, '');
        if (stem.length > 2 && stem !== raw) {
            expandedTokens.push({ token: stem, weight: 1.5 });
        }
        // Synonym cluster expansion
        const cluster = TERM_TO_CLUSTER.get(raw) || TERM_TO_CLUSTER.get(stem);
        if (cluster) {
            for (const syn of cluster) {
                expandedTokens.push({ token: syn, weight: 1.2 });
            }
        }
    }
    // Project tokens and n-grams into 384-dimensional dense space
    for (let i = 0; i < expandedTokens.length; i++) {
        const { token, weight } = expandedTokens[i];
        const hash = hashString(token);
        const index = Math.abs(hash) % dim;
        const sign = (hash & 1) === 0 ? 1 : -1;
        vector[index] += sign * weight;
        // Subword character trigrams for typo-resilient embedding
        if (token.length >= 3) {
            for (let j = 0; j <= token.length - 3; j++) {
                const trigram = token.substring(j, j + 3);
                const triHash = hashString(`tri_${trigram}`);
                const triIdx = Math.abs(triHash) % dim;
                vector[triIdx] += 0.3 * weight;
            }
        }
    }
    // Token Bigrams
    for (let i = 0; i < rawTokens.length - 1; i++) {
        const bigram = `${rawTokens[i]}_${rawTokens[i + 1]}`;
        const biHash = hashString(bigram);
        const biIndex = Math.abs(biHash) % dim;
        vector[biIndex] += 1.8;
    }
    // L2 unit normalization
    let sumSq = 0;
    for (let v of vector)
        sumSq += v * v;
    const magnitude = Math.sqrt(sumSq);
    if (magnitude > 0) {
        for (let i = 0; i < dim; i++) {
            vector[i] /= magnitude;
        }
    }
    return vector;
}
function hashString(str) {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        hash = (hash * 33) ^ str.charCodeAt(i);
    }
    return hash;
}
export function cosineSimilarity(vecA, vecB) {
    if (vecA.length !== vecB.length || vecA.length === 0)
        return 0;
    let dotProduct = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
    }
    return Math.max(0, Math.min(1, dotProduct));
}
export function indexBugEmbedding(bugId, title, description) {
    const vector = generateEmbedding(`${title} ${description}`);
    const json = JSON.stringify(vector);
    db.prepare(`
    INSERT INTO bug_embeddings (bug_id, vector_json)
    VALUES (?, ?)
    ON CONFLICT(bug_id) DO UPDATE SET vector_json = excluded.vector_json
  `).run(bugId, json);
}
export function findDuplicates(title, description = '', excludeBugId, currentUser, limit = 5, minScore = 0.40) {
    const queryVector = generateEmbedding(`${title} ${description}`);
    const rows = db.prepare(`
    SELECT b.id, b.title, b.status, b.security_group_id, e.vector_json
    FROM bugs b
    JOIN bug_embeddings e ON b.id = e.bug_id
    WHERE (? IS NULL OR b.id != ?)
  `).all(excludeBugId || null, excludeBugId || null);
    const matches = [];
    for (const row of rows) {
        if (!canUserViewBug(currentUser, row.id)) {
            continue;
        }
        try {
            const bugVector = JSON.parse(row.vector_json);
            const score = cosineSimilarity(queryVector, bugVector);
            if (score >= minScore) {
                matches.push({
                    bug_id: row.id,
                    title: row.title,
                    status: row.status,
                    similarity_score: Math.round(score * 100) / 100
                });
            }
        }
        catch (err) {
            // Ignore parse error
        }
    }
    // Sort descending by similarity score
    matches.sort((a, b) => b.similarity_score - a.similarity_score);
    return matches.slice(0, limit);
}
//# sourceMappingURL=duplicate-radar.js.map
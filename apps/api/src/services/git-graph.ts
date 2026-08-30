import { GitGraph, GitGraphNode, GitGraphLane, GitCommit, ProjectGitTelemetry } from '@triarc/shared-types';

/**
 * Builds the network view of a repository from a flat commit list.
 *
 * The trunk (default branch) always occupies lane 0 so it renders as one
 * continuous spine; every other branch gets its own lane, diverging from the
 * trunk at the commit preceding its first commit and merging back when a merge
 * commit referencing it appears.
 */

const SLEEPER_THRESHOLD_MS = 3 * 24 * 60 * 60 * 1000; // 3 days, matching the sleeper-branch radar

function detectDefaultBranch(commits: GitCommit[], declared?: string): string {
  if (declared) return declared;
  const names = new Set(commits.map((c) => c.branch));
  for (const candidate of ['main', 'master', 'trunk', 'develop']) {
    if (names.has(candidate)) return candidate;
  }
  // Otherwise the branch carrying the most commits is the trunk.
  const counts = new Map<string, number>();
  for (const c of commits) counts.set(c.branch, (counts.get(c.branch) || 0) + 1);
  let best = 'main';
  let bestN = -1;
  for (const [name, n] of counts) {
    if (n > bestN) { best = name; bestN = n; }
  }
  return best;
}

/** A merge commit's subject usually names the branch it closed. */
function branchFromMergeMessage(message: string): string | null {
  const patterns = [
    /Merge branch ['"]([^'"]+)['"]/i,
    /Merge pull request #\d+ from [^/\s]+\/(\S+)/i,
    /Merge ['"]?([\w.\-/]+)['"]? into/i
  ];
  for (const re of patterns) {
    const m = message.match(re);
    if (m && m[1]) return m[1].trim();
  }
  return null;
}

export function buildGitGraph(
  telemetry: Pick<ProjectGitTelemetry, 'repo_url' | 'commits' | 'branches'>,
  options: { isLive?: boolean; defaultBranch?: string } = {}
): GitGraph {
  const { repo_url, commits, branches } = telemetry;

  // Oldest first so `index` reads left-to-right as time.
  const ordered = [...commits].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const defaultBranch = detectDefaultBranch(ordered, options.defaultBranch);

  // Lane 0 is the trunk; other branches take lanes in order of first appearance.
  const laneOf = new Map<string, number>([[defaultBranch, 0]]);
  for (const c of ordered) {
    if (!laneOf.has(c.branch)) laneOf.set(c.branch, laneOf.size);
  }

  const nodes: GitGraphNode[] = ordered.map((c, index) => {
    const isMerge = (c.parents?.length ?? 0) > 1 || /^merge\b/i.test(c.message);
    return {
      sha: c.sha,
      short_sha: c.short_sha,
      message: c.message,
      author_name: c.author_name,
      author_username: c.author_username,
      author_avatar: c.author_avatar,
      branch: c.branch,
      created_at: c.created_at,
      url: c.url,
      bug_id: c.bug_id,
      bug_title: c.bug_title,
      lane: laneOf.get(c.branch) ?? 0,
      index,
      is_merge: isMerge
    };
  });

  // A branch is merged when a trunk merge commit names it, or when the
  // branch metadata already says so.
  const mergedAt = new Map<string, number>();
  for (const n of nodes) {
    if (!n.is_merge || n.lane !== 0) continue;
    const named = branchFromMergeMessage(n.message);
    if (named && laneOf.has(named) && named !== defaultBranch && !mergedAt.has(named)) {
      mergedAt.set(named, n.index);
    }
  }

  const declaredState = new Map(branches.map((b) => [b.name, b]));
  const now = Date.now();

  const lanes: GitGraphLane[] = [...laneOf.entries()].map(([branch, lane]) => {
    const own = nodes.filter((n) => n.branch === branch);
    const first = own[0];
    const last = own[own.length - 1];
    const isDefault = branch === defaultBranch;

    // Divergence point: the last trunk commit before this branch's first commit.
    // Long-lived release branches often predate every trunk commit we fetched;
    // there is no honest anchor for those, so leave it null and let the lane
    // simply begin at its own first commit rather than inventing a fork point.
    let branchedFrom: number | null = null;
    if (!isDefault && first) {
      const trunkBefore = nodes.filter((n) => n.lane === 0 && n.index < first.index);
      branchedFrom = trunkBefore.length ? trunkBefore[trunkBefore.length - 1].index : null;
    }

    const mergedIndex = mergedAt.get(branch) ?? null;
    const isMerged = mergedIndex !== null;
    const lastAt = last?.created_at ?? declaredState.get(branch)?.last_commit_at ?? new Date().toISOString();
    const stale = now - new Date(lastAt).getTime() > SLEEPER_THRESHOLD_MS;

    return {
      branch,
      lane,
      is_default: isDefault,
      // Only an unmerged, non-trunk branch can be a sleeper.
      is_sleeper: !isDefault && !isMerged && stale,
      is_merged: isMerged,
      branched_from_index: branchedFrom,
      merged_at_index: mergedIndex,
      first_commit_at: first?.created_at ?? lastAt,
      last_commit_at: lastAt,
      commit_count: own.length,
      author: first?.author_name ?? declaredState.get(branch)?.author ?? 'unknown'
    };
  });

  const spanMs = nodes.length > 1
    ? new Date(nodes[nodes.length - 1].created_at).getTime() - new Date(nodes[0].created_at).getTime()
    : 0;

  return {
    repo_url,
    default_branch: defaultBranch,
    nodes,
    lanes,
    is_live: options.isLive ?? false,
    stats: {
      total_commits: nodes.length,
      total_branches: lanes.length,
      open_branches: lanes.filter((l) => !l.is_default && !l.is_merged).length,
      sleeper_branches: lanes.filter((l) => l.is_sleeper).length,
      contributors: new Set(nodes.map((n) => n.author_username)).size,
      spans_days: Math.max(1, Math.round(spanMs / (24 * 60 * 60 * 1000)))
    }
  };
}

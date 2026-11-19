import type { Attempt } from './storage';
import type { Difficulty, JudgeProblem } from './types';

const RANK: Record<Difficulty, number> = { easy: 0, medium: 1, hard: 2 };

export interface Recommendation {
  problem: JudgeProblem;
  /** "resume": an unfinished problem the learner already tried. "next": the easiest unsolved one. */
  reason: 'resume' | 'next';
}

/**
 * What to practise next. First choice is finishing a problem that was attempted but never solved
 * (most recent first); otherwise the easiest problem not yet solved, in list order.
 * `attempts` is newest first, as stored. Returns null once everything is solved.
 */
export function recommendNext(problems: JudgeProblem[], attempts: Attempt[]): Recommendation | null {
  const solved = new Set(attempts.filter((a) => a.verdict === 'accepted').map((a) => a.problemId));
  const byId = new Map(problems.map((p) => [p.id, p]));

  for (const a of attempts) {
    const p = byId.get(a.problemId);
    if (p && !solved.has(p.id)) return { problem: p, reason: 'resume' };
  }

  const unsolved = problems
    .map((p, index) => ({ p, index }))
    .filter(({ p }) => !solved.has(p.id))
    .sort((x, y) => RANK[x.p.difficulty] - RANK[y.p.difficulty] || x.index - y.index);
  return unsolved.length ? { problem: unsolved[0].p, reason: 'next' } : null;
}

export type ProblemStatus = 'todo' | 'tried' | 'solved';

export function problemStatus(id: string, attempts: Attempt[]): ProblemStatus {
  let tried = false;
  for (const a of attempts) {
    if (a.problemId !== id) continue;
    if (a.verdict === 'accepted') return 'solved';
    tried = true;
  }
  return tried ? 'tried' : 'todo';
}

/** Yes/no answers the learner gives about a problem. Each one is a plain question in the guide. */
export interface TechniqueAnswers {
  /** The input is small, roughly 1000 items or fewer. */
  smallInput: boolean;
  /** The input is a graph, a grid, or a set of connections. */
  graph: boolean;
  /** The connections have lengths or costs. */
  weighted: boolean;
  /** The input is already sorted (or sorting it is cheap). */
  sorted: boolean;
  /** You are asked for a minimum, a maximum, or the best value. */
  bestOrCount: boolean;
  /** You are asked about a contiguous part (a block) of an array. */
  subarray: boolean;
  /** Each decision depends on earlier decisions, and smaller cases repeat. */
  choices: boolean;
  /** Items have a weight or capacity limit. */
  capacity: boolean;
  /** The answer is taken modulo a number, or the exponent is huge. */
  mod: boolean;
  /** You work with primes. */
  primes: boolean;
  /** You need a common divisor or a simplified fraction. */
  divisibility: boolean;
  /** You join groups and ask whether two items are in the same group. */
  mergeGroups: boolean;
  /** Things must close in reverse order, such as brackets. */
  nesting: boolean;
}

export const NO_ANSWERS: TechniqueAnswers = {
  smallInput: false, graph: false, weighted: false, sorted: false, bestOrCount: false, subarray: false,
  choices: false, capacity: false, mod: false, primes: false, divisibility: false, mergeGroups: false, nesting: false,
};

export interface TechniqueAdvice {
  /** The id of an entry in ALGORITHMS (src/judge/data/algorithms.ts). */
  algorithmId: string;
  /** Why this technique fits the answers. */
  reason: string;
  /** When the learner should not use it. */
  dontUse: string;
}

/**
 * Picks one technique from the answers. The rules are checked in order and the first match wins,
 * so the more specific ones (a capacity limit, a graph with weights) come before the general ones.
 * If nothing matches, brute force is the honest starting point.
 */
export function recommendTechnique(a: TechniqueAnswers): TechniqueAdvice {
  if (a.smallInput) return {
    algorithmId: 'brute-force',
    reason: 'The input is small, so checking every option is fast enough, and it is the easiest way to get a correct answer.',
    dontUse: 'The input is large (around 10^5 items or more). Checking every pair or option will time out there.',
  };
  if (a.graph && a.weighted) return {
    algorithmId: 'dijkstra',
    reason: 'The roads have lengths and you want the cheapest route, so you need weighted shortest paths.',
    dontUse: 'Some lengths are negative (use Bellman-Ford), or the roads have no lengths (BFS is simpler).',
  };
  if (a.graph && a.mergeGroups) return {
    algorithmId: 'dsu',
    reason: 'You keep joining groups and ask whether two items are together, so union-find fits.',
    dontUse: 'You need actual paths or distances, not only group membership. Use BFS or DFS.',
  };
  if (a.graph) return {
    algorithmId: 'bfs',
    reason: 'The roads have no lengths, and BFS finds the fewest steps between nodes.',
    dontUse: 'You only need to know which nodes are connected. DFS works and is simpler. Do not use DFS for the fewest steps.',
  };
  if (a.mod) return {
    algorithmId: 'mod-pow',
    reason: 'The answer is taken modulo a number and the exponent is large, so repeated squaring keeps it fast.',
    dontUse: 'You need the exact number, and it is small enough to compute directly.',
  };
  if (a.divisibility) return {
    algorithmId: 'euclid-gcd',
    reason: 'You need a common divisor or a simplified fraction, which Euclid\'s algorithm gives in a few steps.',
    dontUse: 'You need every divisor or every prime. Use the sieve or trial division instead.',
  };
  if (a.primes) return {
    algorithmId: 'sieve',
    reason: 'You need many primes or many primality checks below a limit, and the sieve does them all at once.',
    dontUse: 'You check just one number. Trial division up to its square root is enough.',
  };
  if (a.nesting) return {
    algorithmId: 'stack',
    reason: 'Things must close in reverse order of opening, like brackets. A stack keeps the most recent one on top.',
    dontUse: 'The order does not matter. A counter or a set is simpler.',
  };
  if (a.sorted && !a.subarray && !a.choices) return {
    algorithmId: 'binary-search',
    reason: 'The data is sorted, so each comparison can throw away half of the remaining range.',
    dontUse: 'The data is not sorted (sort it first). If you need a pair of items with a sum, use two pointers instead.',
  };
  if (a.subarray && a.bestOrCount) return {
    algorithmId: 'kadane',
    reason: 'You want the best contiguous block, and the best block ending at each position can be extended one step at a time.',
    dontUse: 'The block has a fixed size: use a sliding window. You need many range sums: use prefix sums.',
  };
  if (a.subarray) return {
    algorithmId: 'prefix-sums',
    reason: 'You need sums of many ranges of the array, and one pass of prefix sums answers each in constant time.',
    dontUse: 'The blocks have a fixed size and you need the best one. Use a sliding window.',
  };
  if (a.choices && a.capacity) return {
    algorithmId: 'knapsack',
    reason: 'Each item can be taken once, there is a weight limit, and you want the most value that fits.',
    dontUse: 'Items can be used many times, or there is no limit. Use the coin-change style table instead.',
  };
  if (a.choices) return {
    algorithmId: 'dp-basics',
    reason: 'Each decision depends on earlier decisions, and the same smaller cases come up again and again.',
    dontUse: 'One sort rule always gives the best answer. Then greedy is simpler and faster.',
  };
  if (a.bestOrCount) return {
    algorithmId: 'greedy',
    reason: 'You can sort by one rule and make each choice once, without going back.',
    dontUse: 'An early choice changes what is best later (for example with coins 1, 3, 4). Use dynamic programming.',
  };
  return {
    algorithmId: 'brute-force',
    reason: 'None of the features above stand out, so start by checking every option.',
    dontUse: 'The input is large. Look at the questions again to find the structure that makes a faster method possible.',
  };
}

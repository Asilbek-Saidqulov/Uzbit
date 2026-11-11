import type { Language } from '../types';

export interface Algorithm {
  id: string;
  name: string;
  category: string;
  /** What the idea is, in short paragraphs. */
  idea: string[];
  whenToUse: string;
  time: string;
  space: string;
  code: Partial<Record<Language, string>>;
  /** A short example call appended to the code so Try it prints a result. */
  demo: Partial<Record<Language, string>>;
  /** Problem ids that practice this technique. */
  practice: string[];
}

export const ALGORITHMS: Algorithm[] = [
  {
    id: 'binary-search',
    name: 'Binary search',
    category: 'Searching',
    idea: [
      'Look at the middle element of a sorted range. If it equals the target, you are done. If the target is larger, discard the left half. If it is smaller, discard the right half.',
      'Each step halves the range, so you need about log₂(n) steps to search n items.',
    ],
    whenToUse: 'The data is sorted, or you can ask a yes/no question that splits the search space in half.',
    time: 'O(log n)',
    space: 'O(1)',
    code: {
      python: "def binary_search(a, x):\n    lo, hi = 0, len(a) - 1\n    while lo <= hi:\n        mid = (lo + hi) // 2\n        if a[mid] == x:\n            return mid\n        if a[mid] < x:\n            lo = mid + 1\n        else:\n            hi = mid - 1\n    return -1\n",
      javascript: "function binarySearch(a, x) {\n  let lo = 0, hi = a.length - 1;\n  while (lo <= hi) {\n    const mid = (lo + hi) >> 1;\n    if (a[mid] === x) return mid;\n    if (a[mid] < x) lo = mid + 1;\n    else hi = mid - 1;\n  }\n  return -1;\n}\n",
    },
    demo: {
      python: 'print(binary_search([1, 3, 5, 7, 9], 7))   # prints 3',
      javascript: 'print(binarySearch([1, 3, 5, 7, 9], 7));   // prints 3',
    },
    practice: ['binary-search'],
  },
  {
    id: 'two-pointers',
    name: 'Two pointers',
    category: 'Arrays',
    idea: [
      'Keep one index at the start and one at the end of a sorted array. Compare the sum of the two values. If the sum is too small, move the left index right. If it is too large, move the right index left.',
      'Every step rules out one element for good, so one pass is enough.',
    ],
    whenToUse: 'You need a pair, or a window, in a sorted array that satisfies a condition.',
    time: 'O(n)',
    space: 'O(1)',
    code: {
      python: "def has_pair_with_sum(a, target):\n    lo, hi = 0, len(a) - 1\n    while lo < hi:\n        s = a[lo] + a[hi]\n        if s == target:\n            return True\n        if s < target:\n            lo += 1\n        else:\n            hi -= 1\n    return False\n",
      javascript: "function hasPairWithSum(a, target) {\n  let lo = 0, hi = a.length - 1;\n  while (lo < hi) {\n    const s = a[lo] + a[hi];\n    if (s === target) return true;\n    if (s < target) lo++;\n    else hi--;\n  }\n  return false;\n}\n",
    },
    demo: {
      python: 'print(has_pair_with_sum([1, 3, 5, 7, 9], 12))   # prints True',
      javascript: 'print(hasPairWithSum([1, 3, 5, 7, 9], 12));   // prints true',
    },
    practice: [],
  },
  {
    id: 'prefix-sums',
    name: 'Prefix sums',
    category: 'Arrays',
    idea: [
      'Store running totals: prefix[i] is the sum of the first i values. Then the sum of any range l..r (inclusive, 0-based) is prefix[r + 1] − prefix[l], in constant time.',
      'You pay O(n) once to build the table, and then every range query is O(1).',
    ],
    whenToUse: 'Many queries ask for the sum of a range of a fixed array.',
    time: 'O(n) build, O(1) per query',
    space: 'O(n)',
    code: {
      python: "def range_sums(nums, queries):\n    prefix = [0]\n    for x in nums:\n        prefix.append(prefix[-1] + x)\n    return [prefix[r + 1] - prefix[l] for l, r in queries]\n",
      javascript: "function rangeSums(nums, queries) {\n  const prefix = [0];\n  for (const x of nums) prefix.push(prefix[prefix.length - 1] + x);\n  return queries.map(([l, r]) => prefix[r + 1] - prefix[l]);\n}\n",
    },
    demo: {
      python: 'print(range_sums([1, 2, 3, 4, 5], [(0, 2), (1, 4)]))   # prints [6, 14]',
      javascript: 'print(JSON.stringify(rangeSums([1, 2, 3, 4, 5], [[0, 2], [1, 4]])));   // prints [6,14]',
    },
    practice: [],
  },
  {
    id: 'kadane',
    name: "Kadane's algorithm",
    category: 'Dynamic programming',
    idea: [
      'Walk through the array while keeping two numbers: the best sum of a subarray that ends at the current element, and the best sum seen so far.',
      'At each element, either extend the previous subarray or start a new one here, whichever is larger.',
    ],
    whenToUse: 'You need the maximum sum of a contiguous subarray.',
    time: 'O(n)',
    space: 'O(1)',
    code: {
      python: "def max_subarray(a):\n    best = cur = a[0]\n    for x in a[1:]:\n        cur = max(x, cur + x)\n        best = max(best, cur)\n    return best\n",
      javascript: "function maxSubarray(a) {\n  let best = a[0], cur = a[0];\n  for (let i = 1; i < a.length; i++) {\n    cur = Math.max(a[i], cur + a[i]);\n    best = Math.max(best, cur);\n  }\n  return best;\n}\n",
    },
    demo: {
      python: 'print(max_subarray([-2, 1, -3, 4, -1, 2, 1, -5, 4]))   # prints 6',
      javascript: 'print(maxSubarray([-2, 1, -3, 4, -1, 2, 1, -5, 4]));   // prints 6',
    },
    practice: ['max-subarray'],
  },
  {
    id: 'sieve',
    name: 'Sieve of Eratosthenes',
    category: 'Number theory',
    idea: [
      'Start with every number from 2 to n-1 marked as prime. For each prime p, cross out its multiples, starting at p². Numbers that remain marked are prime.',
      'You only need to test divisors up to the square root of n, because any composite number has a factor that small.',
    ],
    whenToUse: 'You need every prime below a limit, or many primality checks.',
    time: 'O(n log log n)',
    space: 'O(n)',
    code: {
      python: "def count_primes(n):\n    if n < 3:\n        return 0\n    is_prime = [True] * n\n    is_prime[0] = is_prime[1] = False\n    for i in range(2, int(n ** 0.5) + 1):\n        if is_prime[i]:\n            for j in range(i * i, n, i):\n                is_prime[j] = False\n    return sum(is_prime)\n",
      javascript: "function countPrimes(n) {\n  if (n < 3) return 0;\n  const isPrime = new Array(n).fill(true);\n  isPrime[0] = isPrime[1] = false;\n  for (let i = 2; i * i < n; i++) {\n    if (isPrime[i]) {\n      for (let j = i * i; j < n; j += i) isPrime[j] = false;\n    }\n  }\n  return isPrime.filter(Boolean).length;\n}\n",
    },
    demo: {
      python: 'print(count_primes(100))   # prints 25',
      javascript: 'print(countPrimes(100));   // prints 25',
    },
    practice: ['py-int-primes'],
  },
  {
    id: 'bfs',
    name: 'Breadth-first search',
    category: 'Graphs',
    idea: [
      'Start at a node and visit all of its neighbours, then all of their neighbours, and so on. A queue keeps this order: first in, first out.',
      'In an unweighted graph, the first time BFS reaches a node is along a shortest path to it.',
    ],
    whenToUse: 'You need the fewest steps between two nodes, or everything reachable within some distance.',
    time: 'O(V + E)',
    space: 'O(V)',
    code: {
      python: "from collections import deque\n\ndef bfs_distances(graph, start):\n    dist = {start: 0}\n    queue = deque([start])\n    while queue:\n        node = queue.popleft()\n        for nxt in graph[node]:\n            if nxt not in dist:\n                dist[nxt] = dist[node] + 1\n                queue.append(nxt)\n    return dist\n",
      javascript: "function bfsDistances(graph, start) {\n  const dist = new Map([[start, 0]]);\n  const queue = [start];\n  for (let head = 0; head < queue.length; head++) {\n    const node = queue[head];\n    for (const nxt of graph[node] ?? []) {\n      if (!dist.has(nxt)) {\n        dist.set(nxt, dist.get(node) + 1);\n        queue.push(nxt);\n      }\n    }\n  }\n  return dist;\n}\n",
    },
    demo: {
      python: 'graph = {1: [2, 3], 2: [4], 3: [4], 4: []}\nprint(bfs_distances(graph, 1))   # prints {1: 0, 2: 1, 3: 1, 4: 2}',
      javascript: 'const graph = {1: [2, 3], 2: [4], 3: [4], 4: []};\nprint(JSON.stringify(Object.fromEntries(bfsDistances(graph, 1))));   // prints {"1":0,"2":1,"3":1,"4":2}',
    },
    practice: [],
  },
];

/** The implementation plus its example call: what the panel shows and what Try it runs. */
export function runnableCode(alg: Algorithm, language: Language): { language: Language; code: string } {
  const lang: Language = alg.code[language] ? language : 'python';
  const body = alg.code[lang] ?? '';
  const demo = alg.demo[lang] ?? '';
  const comment = lang === 'python' ? '#' : '//';
  return { language: lang, code: `${body}\n${comment} Example\n${demo}\n` };
}

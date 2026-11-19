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
  /** Why the method is correct, in short plain words. */
  whyItWorks: string;
  /** Mistakes beginners make with this method. */
  traps: string[];
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
    whyItWorks: "Each comparison throws away half of the remaining range, so after k comparisons only n / 2^k items are left. The search ends after about log2(n) steps.",
    traps: [
      "Off-by-one: starting hi at a.size() instead of a.size() - 1 reads past the end of the array.",
      "Overflow: (lo + hi) / 2 can overflow for huge indices. Write lo + (hi - lo) / 2.",
      "Infinite loop: setting lo = mid instead of mid + 1 stops making progress when lo and mid are equal.",
      "The data must be sorted. On unsorted input the answer is silently wrong.",
    ],
    time: 'O(log n)',
    space: 'O(1)',
    code: {
      python: "def binary_search(a, x):\n    lo, hi = 0, len(a) - 1\n    while lo <= hi:\n        mid = (lo + hi) // 2\n        if a[mid] == x:\n            return mid\n        if a[mid] < x:\n            lo = mid + 1\n        else:\n            hi = mid - 1\n    return -1\n",
      javascript: "function binarySearch(a, x) {\n  let lo = 0, hi = a.length - 1;\n  while (lo <= hi) {\n    const mid = (lo + hi) >> 1;\n    if (a[mid] === x) return mid;\n    if (a[mid] < x) lo = mid + 1;\n    else hi = mid - 1;\n  }\n  return -1;\n}\n",
      cpp: `#include <bits/stdc++.h>
using namespace std;

// Index of x in the sorted vector a, or -1 if it is not there.
int binarySearch(const vector<int>& a, int x) {
    int lo = 0, hi = (int)a.size() - 1;
    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;   // written this way so it cannot overflow
        if (a[mid] == x) return mid;
        if (a[mid] < x) lo = mid + 1;
        else hi = mid - 1;
    }
    return -1;
}

int main() {
    vector<int> a = {1, 3, 5, 7, 9};
    cout << binarySearch(a, 7) << "\\n";   // prints 3
    return 0;
}
`,
    },
    demo: {
      cpp: '',
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
    whyItWorks: "The array is sorted, so if the sum is too small, the only way to grow it is to move the left pointer right. The right pointer must stay put, and each step rules out one index for good.",
    traps: [
      "Forgetting that the array must be sorted first.",
      "Using lo <= hi instead of lo < hi: the loop then pairs an element with itself.",
      "Returning the first pair found when the problem asks for every pair or a count.",
    ],
    time: 'O(n)',
    space: 'O(1)',
    code: {
      python: "def has_pair_with_sum(a, target):\n    lo, hi = 0, len(a) - 1\n    while lo < hi:\n        s = a[lo] + a[hi]\n        if s == target:\n            return True\n        if s < target:\n            lo += 1\n        else:\n            hi -= 1\n    return False\n",
      javascript: "function hasPairWithSum(a, target) {\n  let lo = 0, hi = a.length - 1;\n  while (lo < hi) {\n    const s = a[lo] + a[hi];\n    if (s === target) return true;\n    if (s < target) lo++;\n    else hi--;\n  }\n  return false;\n}\n",
      cpp: `#include <bits/stdc++.h>
using namespace std;

// True if two values in the sorted vector a add up to target.
bool hasPairWithSum(const vector<int>& a, int target) {
    int lo = 0, hi = (int)a.size() - 1;
    while (lo < hi) {
        int s = a[lo] + a[hi];
        if (s == target) return true;
        if (s < target) lo++;
        else hi--;
    }
    return false;
}

int main() {
    vector<int> a = {1, 3, 5, 7, 9};
    cout << boolalpha << hasPairWithSum(a, 12) << "\\n";   // prints true
    return 0;
}
`,
    },
    demo: {
      cpp: '',
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
    whyItWorks: "Once pre[i] holds the total of the first i elements, any range sum is one subtraction. Building the table takes one pass, and each query after that takes O(1).",
    traps: [
      "Off-by-one: pre has n + 1 entries, and the sum of a[l..r] is pre[r + 1] - pre[l], not pre[r] - pre[l].",
      "Overflow: sums of many large values need long long.",
      "The table only matches the array it was built from. If the array changes, rebuild it.",
    ],
    time: 'O(n) build, O(1) per query',
    space: 'O(n)',
    code: {
      python: "def range_sums(nums, queries):\n    prefix = [0]\n    for x in nums:\n        prefix.append(prefix[-1] + x)\n    return [prefix[r + 1] - prefix[l] for l, r in queries]\n",
      javascript: "function rangeSums(nums, queries) {\n  const prefix = [0];\n  for (const x of nums) prefix.push(prefix[prefix.length - 1] + x);\n  return queries.map(([l, r]) => prefix[r + 1] - prefix[l]);\n}\n",
      cpp: `#include <bits/stdc++.h>
using namespace std;

// pre[i] = a[0] + ... + a[i-1], so the sum of a[l..r] is pre[r+1] - pre[l].
int main() {
    vector<long long> a = {4, 2, 7, 1, 9};
    int n = a.size();
    vector<long long> pre(n + 1, 0);
    for (int i = 0; i < n; i++) pre[i + 1] = pre[i] + a[i];

    int l = 1, r = 3;                       // elements 2, 7, 1
    cout << pre[r + 1] - pre[l] << "\\n";    // prints 10
    return 0;
}
`,
    },
    demo: {
      cpp: '',
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
    whyItWorks: "The best subarray ending at position i either starts fresh at a[i] or extends the best one that ends at i - 1. Keeping that single number is enough to cover every subarray.",
    traps: [
      "Starting the answer at 0. When every number is negative, the answer is the largest single number, so start from a[0].",
      "Mixing up subarray (contiguous) with subsequence (any picks in order).",
      "Overflow when a long run of large values is summed into an int.",
    ],
    time: 'O(n)',
    space: 'O(1)',
    code: {
      python: "def max_subarray(a):\n    best = cur = a[0]\n    for x in a[1:]:\n        cur = max(x, cur + x)\n        best = max(best, cur)\n    return best\n",
      javascript: "function maxSubarray(a) {\n  let best = a[0], cur = a[0];\n  for (let i = 1; i < a.length; i++) {\n    cur = Math.max(a[i], cur + a[i]);\n    best = Math.max(best, cur);\n  }\n  return best;\n}\n",
      cpp: "#include <bits/stdc++.h>\nusing namespace std;\n\n// cur = best sum of a subarray that ends at i. Either start fresh at a[i] or extend the previous one.\nlong long maxSubarray(const vector<long long>& a) {\n    long long cur = a[0], best = a[0];\n    for (size_t i = 1; i < a.size(); i++) {\n        cur = max(a[i], cur + a[i]);\n        best = max(best, cur);\n    }\n    return best;\n}\n\nint main() {\n    cout << maxSubarray({-2, 1, -3, 4, -1, 2, 1, -5, 4}) << \"\\n\";   // prints 6\n    return 0;\n}\n",
    },
    demo: {
      cpp: '',
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
    whyItWorks: "Every composite number has a smallest prime factor p, and it gets crossed out when we reach p. Starting at p * p is enough, because smaller multiples were already crossed out by smaller primes.",
    traps: [
      "Starting the inner loop at i instead of i * i: it crosses out the prime itself.",
      "Overflow when computing i * i for large n. Use long long for the loop variable.",
      "For primes below n, the array must have n entries (indices 0 to n - 1).",
    ],
    time: 'O(n log log n)',
    space: 'O(n)',
    code: {
      python: "def count_primes(n):\n    if n < 3:\n        return 0\n    is_prime = [True] * n\n    is_prime[0] = is_prime[1] = False\n    for i in range(2, int(n ** 0.5) + 1):\n        if is_prime[i]:\n            for j in range(i * i, n, i):\n                is_prime[j] = False\n    return sum(is_prime)\n",
      javascript: "function countPrimes(n) {\n  if (n < 3) return 0;\n  const isPrime = new Array(n).fill(true);\n  isPrime[0] = isPrime[1] = false;\n  for (let i = 2; i * i < n; i++) {\n    if (isPrime[i]) {\n      for (let j = i * i; j < n; j += i) isPrime[j] = false;\n    }\n  }\n  return isPrime.filter(Boolean).length;\n}\n",
      cpp: `#include <bits/stdc++.h>
using namespace std;

// Number of primes strictly below n.
int countPrimes(int n) {
    if (n < 3) return 0;
    vector<bool> isPrime(n, true);
    isPrime[0] = isPrime[1] = false;
    for (long long i = 2; i * i < n; i++) {
        if (isPrime[i]) {
            for (long long j = i * i; j < n; j += i) isPrime[j] = false;
        }
    }
    return count(isPrime.begin(), isPrime.end(), true);
}

int main() {
    cout << countPrimes(100) << "\\n";        // prints 25
    return 0;
}
`,
    },
    demo: {
      cpp: '',
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
    whyItWorks: "The queue holds nodes in order of distance: every node at distance d is handled before any node at distance d + 1. So the first time a node is reached, that is its shortest distance.",
    traps: [
      "Marking a node as visited when it is popped instead of when it is pushed. Nodes then get queued many times.",
      "Forgetting the visited check on graphs with cycles. The loop never ends.",
      "BFS gives the fewest edges, not the least total cost. For weighted edges use Dijkstra.",
    ],
    time: 'O(V + E)',
    space: 'O(V)',
    code: {
      python: "from collections import deque\n\ndef bfs_distances(graph, start):\n    dist = {start: 0}\n    queue = deque([start])\n    while queue:\n        node = queue.popleft()\n        for nxt in graph[node]:\n            if nxt not in dist:\n                dist[nxt] = dist[node] + 1\n                queue.append(nxt)\n    return dist\n",
      javascript: "function bfsDistances(graph, start) {\n  const dist = new Map([[start, 0]]);\n  const queue = [start];\n  for (let head = 0; head < queue.length; head++) {\n    const node = queue[head];\n    for (const nxt of graph[node] ?? []) {\n      if (!dist.has(nxt)) {\n        dist.set(nxt, dist.get(node) + 1);\n        queue.push(nxt);\n      }\n    }\n  }\n  return dist;\n}\n",
      cpp: `#include <bits/stdc++.h>
using namespace std;

// Shortest number of edges from start to every reachable node.
// graph[v] lists the neighbours of node v. Nodes are numbered 0..n-1.
vector<int> bfsDistances(const vector<vector<int>>& graph, int start) {
    vector<int> dist(graph.size(), -1);      // -1 means "not reached yet"
    queue<int> q;
    dist[start] = 0;
    q.push(start);
    while (!q.empty()) {
        int v = q.front();
        q.pop();
        for (int nxt : graph[v]) {
            if (dist[nxt] == -1) {
                dist[nxt] = dist[v] + 1;
                q.push(nxt);
            }
        }
    }
    return dist;
}

int main() {
    vector<vector<int>> graph = {{1, 2}, {3}, {3}, {}};   // 0->1, 0->2, 1->3, 2->3
    for (int d : bfsDistances(graph, 0)) cout << d << " ";
    cout << "\\n";                            // prints 0 1 1 2
    return 0;
}
`,
    },
    demo: {
      cpp: '',
      python: 'graph = {1: [2, 3], 2: [4], 3: [4], 4: []}\nprint(bfs_distances(graph, 1))   # prints {1: 0, 2: 1, 3: 1, 4: 2}',
      javascript: 'const graph = {1: [2, 3], 2: [4], 3: [4], 4: []};\nprint(JSON.stringify(Object.fromEntries(bfsDistances(graph, 1))));   // prints {"1":0,"2":1,"3":1,"4":2}',
    },
    practice: [],
  },
  {
    id: 'greedy',
    name: 'Greedy choice',
    category: 'Arrays',
    idea: [
      'Make the locally best choice at each step and never go back. A greedy method works only when the best local choice also leads to the best overall result.',
      'Example: to attend the most meetings, sort them by end time and take each meeting that starts after the last one you took ended. Finishing early leaves the most room for the rest.',
    ],
    whenToUse: 'Choices are made once and never undone, and sorting by one rule (end time, weight, ratio) gives the best total.',
    whyItWorks: "Taking the meeting that ends first leaves the largest possible time window for the rest. Any best plan can swap its first meeting for this one without losing anything.",
    traps: [
      "Sorting by start time instead of end time: one long early meeting can block many short ones.",
      "Using greedy when choices depend on each other. See the coin example in the coin-change entry.",
    ],
    time: 'O(n log n) with the sort',
    space: 'O(1) extra',
    code: {
      cpp: `#include <bits/stdc++.h>
using namespace std;

// Greedy: the most meetings you can attend when each one is [start, end).
// Always pick the meeting that ends earliest among those that still fit.
int maxMeetings(vector<pair<int, int>> m) {
    sort(m.begin(), m.end(), [](const auto& x, const auto& y) {
        return x.second < y.second;          // sort by end time
    });
    int count = 0, lastEnd = INT_MIN;
    for (auto [s, e] : m) {
        if (s >= lastEnd) {                  // it does not overlap the last one we took
            count++;
            lastEnd = e;
        }
    }
    return count;
}

int main() {
    vector<pair<int, int>> m = {{1, 4}, {3, 5}, {0, 6}, {5, 7}, {8, 9}, {5, 9}};
    cout << maxMeetings(m) << "\\n";          // prints 3
    return 0;
}
`,
    },
    demo: {
      cpp: '',
    },
    practice: [],
  },
  {
    id: 'euclid-gcd',
    name: 'Greatest common divisor (Euclid)',
    category: 'Number theory',
    idea: [
      'The greatest common divisor (GCD) of a and b is the largest number that divides both. Replace the pair (a, b) with (b, a mod b). The remainder keeps shrinking, and when it reaches 0 the other number is the answer.',
      'Example: gcd(48, 18). 48 mod 18 = 12, then 18 mod 12 = 6, then 12 mod 6 = 0. The answer is 6.',
    ],
    whenToUse: 'You need a common divisor, want to simplify a fraction, or need the least common multiple (lcm = a / gcd * b).',
    whyItWorks: "gcd(a, b) equals gcd(b, a mod b): any number that divides both a and b also divides a mod b, and the reverse holds too. The numbers shrink quickly, so the loop takes only a few steps.",
    traps: [
      "The loop must stop when the remainder is 0, or it divides by zero.",
      "Overflow in lcm = a / gcd * b. Divide first, then multiply, and use long long.",
      "gcd(0, x) = x. The loop handles it, but check it when you test.",
    ],
    time: 'O(log min(a, b))',
    space: 'O(1)',
    code: {
      cpp: `#include <bits/stdc++.h>
using namespace std;

// Euclid's algorithm: gcd(a, b) = gcd(b, a mod b), until the remainder is 0.
long long gcdEuclid(long long a, long long b) {
    while (b != 0) {
        long long r = a % b;
        a = b;
        b = r;
    }
    return a;
}

int main() {
    cout << gcdEuclid(48, 18) << "\\n";       // prints 6
    cout << gcdEuclid(17, 5) << "\\n";        // prints 1
    return 0;
}
`,
    },
    demo: {
      cpp: '',
    },
    practice: ['gcd'],
  },
  {
    id: "brute-force",
    name: "Brute force (try everything)",
    category: "Basics",
    idea: [
      "Example: find two numbers in [1, 3, 2, 2, 4] that add up to 4. Check every pair: (1,3) works, (2,2) works, the rest do not. The answer is 2 pairs.",
      "General rule: when the input is small, check every possible answer and keep the ones that work. It is the easiest method to write correctly, so it is also the safe fallback for partial points.",
    ],
    whenToUse: "The input is small (about 1000 items or fewer), or you need a correct answer to test a faster idea against.",
    time: "O(n^2) for pairs",
    space: "O(1)",
    whyItWorks: "It checks every candidate, so it cannot miss the answer. Its only weakness is the number of candidates, which grows quickly with the input size.",
    traps: [
      "Time grows with n squared: 10^5 items means 10^10 checks, which times out.",
      "Counting each pair twice. Use j = i + 1, not j = 0.",
    ],
    code: {
      cpp: "#include <bits/stdc++.h>\nusing namespace std;\n\n// Count pairs i < j with a[i] + a[j] == target. Checks every pair: O(n^2).\nint countPairs(const vector<int>& a, int target) {\n    int count = 0;\n    for (int i = 0; i < (int)a.size(); i++)\n        for (int j = i + 1; j < (int)a.size(); j++)\n            if (a[i] + a[j] == target) count++;\n    return count;\n}\n\nint main() {\n    vector<int> a = {1, 3, 2, 2, 4};\n    cout << countPairs(a, 4) << \"\\n\";   // prints 2\n    return 0;\n}\n",
    },
    demo: {
      cpp: '',
    },
    practice: [],
  },
  {
    id: "recursion",
    name: "Recursion",
    category: "Basics",
    idea: [
      "Example: the digit sum of 98765 is 5 + the digit sum of 9876, which is 6 + the digit sum of 987, and so on until one digit is left.",
      "General rule: solve a problem by solving a smaller copy of it. You need a base case that stops the calls, and a recursive case that moves toward the base case.",
    ],
    whenToUse: "A problem is defined in terms of a smaller version of itself, such as trees, splitting a range, or repeated halving.",
    time: "O(n) for n levels",
    space: "O(n) call stack",
    whyItWorks: "Each call makes the problem smaller, and the base case returns a known answer. Each call then builds its answer from the smaller answers it receives.",
    traps: [
      "Missing or wrong base case: the calls never stop and the program crashes with a stack overflow.",
      "A recursive call that does not get smaller, for example calling with the same n.",
      "Very deep recursion (about 10^6 levels) can overflow the stack. A loop is safer there.",
    ],
    code: {
      cpp: "#include <bits/stdc++.h>\nusing namespace std;\n\n// Sum of digits. The problem is defined by a smaller copy of itself:\n// digitSum(n) = last digit + digitSum(n without its last digit).\n// The base case (n < 10) stops the calls.\nlong long digitSum(long long n) {\n    if (n < 10) return n;\n    return n % 10 + digitSum(n / 10);\n}\n\nint main() {\n    cout << digitSum(98765) << \"\\n\";    // prints 35\n    return 0;\n}\n",
    },
    demo: {
      cpp: '',
    },
    practice: [],
  },
  {
    id: "dfs",
    name: "Depth-first search (DFS)",
    category: "Graphs",
    idea: [
      "Example: a map of islands. From one island, walk to a neighbour, then to a neighbour of that one, going as deep as you can. Turn back only at a dead end, and skip islands you already visited.",
      "General rule: go deep first, mark each node when you enter it, and skip nodes that are already marked. The recursion does the turning back for you.",
    ],
    whenToUse: "You need to explore everything reachable from a start, count connected parts, or check whether a path exists at all.",
    time: "O(V + E)",
    space: "O(V)",
    whyItWorks: "Each node is entered once because it gets marked. Every node reachable from the start is visited before the first call returns.",
    traps: [
      "Forgetting to mark nodes. On a graph with cycles the search loops forever.",
      "Using DFS for the shortest path. It finds a path, but not necessarily the shortest one. Use BFS.",
      "A very long path can make the recursion too deep. Large inputs may need an explicit stack.",
    ],
    code: {
      cpp: "#include <bits/stdc++.h>\nusing namespace std;\n\n// Visit everything reachable from v, going as deep as possible before backtracking.\nvoid dfs(int v, const vector<vector<int>>& g, vector<bool>& seen) {\n    seen[v] = true;\n    for (int nxt : g[v])\n        if (!seen[nxt]) dfs(nxt, g, seen);\n}\n\nint main() {\n    // Two groups: {0, 1, 2} and {3, 4}.\n    vector<vector<int>> g = {{1}, {0, 2}, {1}, {4}, {3}};\n    vector<bool> seen(g.size(), false);\n    dfs(0, g, seen);\n    int reached = count(seen.begin(), seen.end(), true);\n    cout << reached << \"\\n\";            // prints 3\n    return 0;\n}\n",
    },
    demo: {
      cpp: '',
    },
    practice: [],
  },
  {
    id: "sort-custom",
    name: "Sorting with a custom key",
    category: "Sorting",
    idea: [
      "Example: sort students by score, highest first, and by name when the scores are equal. The second rule breaks the ties, so the order is complete.",
      "General rule: tell the sort what comes first using a comparator. It answers one question for any two items: should a go before b?",
    ],
    whenToUse: "The default sort is not what you need: descending order, several sort rules, or sorting objects by one field.",
    time: "O(n log n)",
    space: "O(log n) to O(n) extra",
    whyItWorks: "A comparison sort puts items in order by whatever the comparator says. A second rule for ties turns that into one complete, fixed order.",
    traps: [
      "Using <= instead of < in the comparator. The sort can crash or misbehave.",
      "A comparator that is inconsistent, for example a before b and b before a both true.",
      "Sorting in the wrong direction. Check whether you need higher or lower first.",
    ],
    code: {
      cpp: "#include <bits/stdc++.h>\nusing namespace std;\n\nstruct Student {\n    string name;\n    int score;\n};\n\nint main() {\n    vector<Student> s = {{\"Dilshod\", 80}, {\"Aziza\", 95}, {\"Bobur\", 80}};\n    // Key: higher score first; if scores tie, alphabetical name.\n    sort(s.begin(), s.end(), [](const Student& a, const Student& b) {\n        if (a.score != b.score) return a.score > b.score;\n        return a.name < b.name;\n    });\n    for (const auto& x : s) cout << x.name << \" \" << x.score << \"\\n\";\n    // prints Aziza 95, Bobur 80, Dilshod 80\n    return 0;\n}\n",
    },
    demo: {
      cpp: '',
    },
    practice: [],
  },
  {
    id: "stack",
    name: "Stack (last in, first out)",
    category: "Data structures",
    idea: [
      "Example: in {[()]} each closing bracket matches the most recent opening bracket that is still waiting. In ([)] the square bracket is still waiting when the round bracket closes, so the string fails.",
      "General rule: a stack keeps things you are waiting to finish. Push when something opens. Pop when something closes, because the last item pushed is the first one that can close.",
    ],
    whenToUse: "Items wait until something later finishes them, such as matching brackets, undoing actions, or nearest-previous-item problems.",
    time: "O(n)",
    space: "O(n)",
    whyItWorks: "The most recent unfinished item is always on top, so popping it is the only possible match. That is exactly how nested structures have to close.",
    traps: [
      "Popping from an empty stack. Check empty() first.",
      "Forgetting the final check: \"((\" is not balanced even though no bracket mismatch was seen.",
      "Matching a closing bracket with the wrong type of opening bracket.",
    ],
    code: {
      cpp: "#include <bits/stdc++.h>\nusing namespace std;\n\n// Brackets must close in the reverse order they opened: the last opened is the first closed.\n// A stack gives exactly that: push on open, pop on close.\nbool balanced(const string& s) {\n    stack<char> st;\n    for (char c : s) {\n        if (c == '(' || c == '[' || c == '{') {\n            st.push(c);\n        } else {\n            if (st.empty()) return false;\n            char open = st.top();\n            st.pop();\n            if ((c == ')' && open != '(') || (c == ']' && open != '[') || (c == '}' && open != '{'))\n                return false;\n        }\n    }\n    return st.empty();\n}\n\nint main() {\n    cout << boolalpha << balanced(\"{[()]}\") << \" \" << balanced(\"([)]\") << \"\\n\";\n    // prints true false\n    return 0;\n}\n",
    },
    demo: {
      cpp: '',
    },
    practice: [],
  },
  {
    id: "sliding-window",
    name: "Sliding window (fixed size)",
    category: "Arrays",
    idea: [
      "Example: the best 2 neighbouring days in [1, 3, -1, 5, 2]. The pairs have sums 4, 2, 4, 7, so the best is 7.",
      "General rule: when a fixed-size window slides one step, only two numbers change: one enters and one leaves. Update the sum with those two instead of adding the whole window again.",
    ],
    whenToUse: "You need the best, smallest or largest result over every block of k neighbouring elements.",
    time: "O(n)",
    space: "O(1)",
    whyItWorks: "Adding the whole window costs k steps for each window. Moving one step only changes two numbers, so each step takes constant time.",
    traps: [
      "Off-by-one: the element leaving the window is a[i - k], not a[i - k + 1].",
      "Forgetting to compute the first window before sliding.",
      "Using a fixed window when the window size changes. That case needs two pointers.",
    ],
    code: {
      cpp: "#include <bits/stdc++.h>\nusing namespace std;\n\n// Largest sum of k neighbouring elements. Instead of adding k numbers for every window,\n// move the window one step: add the new element, remove the one that left.\nlong long maxWindowSum(const vector<long long>& a, int k) {\n    long long sum = 0;\n    for (int i = 0; i < k; i++) sum += a[i];\n    long long best = sum;\n    for (int i = k; i < (int)a.size(); i++) {\n        sum += a[i] - a[i - k];\n        best = max(best, sum);\n    }\n    return best;\n}\n\nint main() {\n    cout << maxWindowSum({1, 3, -1, 5, 2}, 2) << \"\\n\";   // prints 7\n    return 0;\n}\n",
    },
    demo: {
      cpp: '',
    },
    practice: [],
  },
  {
    id: "dp-basics",
    name: "Dynamic programming (coin change)",
    category: "Dynamic programming",
    idea: [
      "Example: pay 11 with coins 1, 2 and 5 using as few coins as possible. The answer is 5 + 5 + 1, so 3 coins. Find it from the answers for smaller amounts, which are already known.",
      "General rule: when a big answer is built from smaller answers of the same kind, fill a table once for every smaller amount, from smallest to largest. That is dynamic programming.",
    ],
    whenToUse: "The answer for a big input is built from the answers for smaller inputs, and the same smaller inputs come up again and again.",
    time: "O(amount x number of coins)",
    space: "O(amount)",
    whyItWorks: "Each table cell is computed once, from cells that are already filled. No work is repeated, and the table holds every sub-answer the final answer needs.",
    traps: [
      "Greedy is not the same. For coins 1, 3 and 4 with amount 6, taking the biggest coin first gives 4 + 1 + 1 (3 coins), but 3 + 3 uses only 2.",
      "Using INT_MAX for \"impossible\" and then adding 1 to it, which overflows. Use INT_MAX / 2.",
      "Filling the table in the wrong order. Each cell must come after the cells it depends on.",
    ],
    code: {
      cpp: "#include <bits/stdc++.h>\nusing namespace std;\n\n// dp[x] = fewest coins that make exactly x. dp[0] = 0.\n// The last coin used is some c, so dp[x] = 1 + dp[x - c] for the best c.\nint minCoins(const vector<int>& coins, int amount) {\n    const int INF = INT_MAX / 2;\n    vector<int> dp(amount + 1, INF);\n    dp[0] = 0;\n    for (int x = 1; x <= amount; x++)\n        for (int c : coins)\n            if (c <= x && dp[x - c] != INF)\n                dp[x] = min(dp[x], dp[x - c] + 1);\n    return dp[amount] == INF ? -1 : dp[amount];\n}\n\nint main() {\n    cout << minCoins({1, 2, 5}, 11) << \"\\n\";   // prints 3 (5 + 5 + 1)\n    return 0;\n}\n",
    },
    demo: {
      cpp: '',
    },
    practice: [],
  },
  {
    id: "knapsack",
    name: "0/1 knapsack",
    category: "Dynamic programming",
    idea: [
      "Example: you can carry 5 kg. The items are (2 kg, value 3), (3 kg, value 4), (4 kg, value 5) and (5 kg, value 6). Taking the 2 kg and 3 kg items gives value 7 in exactly 5 kg.",
      "General rule: for each item, decide to take it or leave it. Keep the best value for every capacity, and go through the capacity from high to low so one item is not counted twice.",
    ],
    whenToUse: "You choose items with a weight limit, each item can be used once, and you want the best total value.",
    time: "O(items x capacity)",
    space: "O(capacity)",
    whyItWorks: "After handling the first i items, the table holds the best value for each capacity using only those items. Adding one more item only needs the previous row, so one array is enough.",
    traps: [
      "Going up instead of down through the capacity. The same item is then counted several times.",
      "Choosing by value per kilogram. That shortcut fails for 0/1 items.",
      "Looping c from w - 1 or below. Capacity c must be at least the item's weight.",
    ],
    code: {
      cpp: "#include <bits/stdc++.h>\nusing namespace std;\n\n// 0/1 knapsack: each item can be taken once. best[c] = most value that fits in capacity c.\n// Go over the capacity downward, so an item is never added twice.\nlong long knapsack(const vector<pair<int, int>>& items, int capacity) {   // (weight, value)\n    vector<long long> best(capacity + 1, 0);\n    for (auto [w, v] : items)\n        for (int c = capacity; c >= w; c--)\n            best[c] = max(best[c], best[c - w] + v);\n    return best[capacity];\n}\n\nint main() {\n    vector<pair<int, int>> items = {{2, 3}, {3, 4}, {4, 5}, {5, 6}};\n    cout << knapsack(items, 5) << \"\\n\";   // prints 7 (weights 2 + 3)\n    return 0;\n}\n",
    },
    demo: {
      cpp: '',
    },
    practice: [],
  },
  {
    id: "mod-pow",
    name: "Modular power (fast exponentiation)",
    category: "Number theory",
    idea: [
      "Example: 2 to the power 1000000000, modulo 1000000007. Done directly it is far too big. With repeated squaring it takes about 30 multiplications.",
      "General rule: write the exponent in binary. Square the base at every step, and multiply it into the result whenever the current bit is 1. Take the remainder after every multiplication.",
    ],
    whenToUse: "The answer must be taken modulo a number and the exponent is huge, such as counting ways with a limit.",
    time: "O(log exponent)",
    space: "O(1)",
    whyItWorks: "Each squaring doubles the exponent, so about log2(exponent) steps reach the answer. Taking remainders early keeps every number small, and the remainder of a product equals the product of remainders.",
    traps: [
      "Skipping the remainder after a multiplication. The product overflows long long.",
      "Negative results: in C++ a % MOD can be negative. Add MOD when that happens.",
      "Using a modular inverse formula when MOD is not prime.",
    ],
    code: {
      cpp: "#include <bits/stdc++.h>\nusing namespace std;\n\nconst long long MOD = 1000000007LL;\n\n// base^exp mod MOD by repeated squaring: about log2(exp) multiplications instead of exp.\n// Reduce mod after every multiplication, otherwise the numbers overflow.\nlong long modPow(long long base, long long exp) {\n    long long result = 1;\n    base %= MOD;\n    while (exp > 0) {\n        if (exp & 1) result = result * base % MOD;\n        base = base * base % MOD;\n        exp >>= 1;\n    }\n    return result;\n}\n\nint main() {\n    cout << modPow(2, 10) << \"\\n\";            // prints 1024\n    cout << modPow(2, 1000000000LL) << \"\\n\";  // fast even for a huge exponent\n    return 0;\n}\n",
    },
    demo: {
      cpp: '',
    },
    practice: [],
  },
  {
    id: "dsu",
    name: "Disjoint set union (union-find)",
    category: "Graphs",
    idea: [
      "Example: pairs (0,1), (1,2) and (3,4) are connected. The groups are {0,1,2} and {3,4}. A new pair (0,2) changes nothing, because 0 and 2 are already in the same group.",
      "General rule: each group has one representative. To join two groups, make one representative point to the other. To ask whether two items are in the same group, follow the pointers up to the representative.",
    ],
    whenToUse: "You keep merging groups and need to know whether two items are together, or how many groups remain.",
    time: "almost O(1) per operation",
    space: "O(n)",
    whyItWorks: "Path compression and union by size keep the trees very flat, so each find takes almost constant time.",
    traps: [
      "Comparing raw parent values instead of following them up to the representative.",
      "Joining two items that are already in one group and counting it as a merge.",
      "Using a vertex number as the group name without finding its representative first.",
    ],
    code: {
      cpp: "#include <bits/stdc++.h>\nusing namespace std;\n\n// Disjoint set union: keeps groups of items that are known to be connected.\nstruct DSU {\n    vector<int> parent, sz;\n    DSU(int n) : parent(n), sz(n, 1) { iota(parent.begin(), parent.end(), 0); }\n    int find(int x) { return parent[x] == x ? x : parent[x] = find(parent[x]); }   // path compression\n    bool unite(int a, int b) {                                  // false if already together\n        a = find(a);\n        b = find(b);\n        if (a == b) return false;\n        if (sz[a] < sz[b]) swap(a, b);                          // attach the smaller group\n        parent[b] = a;\n        sz[a] += sz[b];\n        return true;\n    }\n};\n\nint main() {\n    int n = 5;\n    DSU d(n);\n    int merges = 0;\n    for (auto [a, b] : vector<pair<int, int>>{{0, 1}, {1, 2}, {0, 2}, {3, 4}})\n        if (d.unite(a, b)) merges++;        // {0,2} is already connected, so it is skipped\n    cout << n - merges << \"\\n\";             // prints 2 groups\n    return 0;\n}\n",
    },
    demo: {
      cpp: '',
    },
    practice: [],
  },
  {
    id: "dijkstra",
    name: "Dijkstra (shortest path with weights)",
    category: "Graphs",
    idea: [
      "Example: roads from city 0. The road 0 to 1 costs 1, 0 to 2 costs 4, 1 to 2 costs 2, and 2 to 3 costs 1. The cheapest way to city 2 is 0 to 1 to 2, cost 3, not the direct road of cost 4.",
      "General rule: always settle the closest city that is not settled yet. A priority queue gives you that city quickly. Whenever you find a cheaper road to a city, update its distance.",
    ],
    whenToUse: "Roads or edges have lengths or costs, and you want the cheapest total from one start to every other node.",
    time: "O((V + E) log V)",
    space: "O(V + E)",
    whyItWorks: "Once the closest unsettled city is taken from the queue, no other road can make it shorter, since every remaining road adds a length that is zero or more.",
    traps: [
      "Negative edge lengths. Dijkstra gives wrong answers then; use Bellman-Ford instead.",
      "Not skipping stale queue entries. The program is correct but slower.",
      "Overflow in distances. Use long long.",
    ],
    code: {
      cpp: "#include <bits/stdc++.h>\nusing namespace std;\n\n// Shortest distance from src to every node when every edge has length >= 0.\n// Always expand the closest node that is not finished yet (priority queue).\nvector<long long> dijkstra(int n, const vector<vector<pair<int, int>>>& g, int src) {  // g[v] = {(to, weight)}\n    const long long INF = LLONG_MAX / 4;\n    vector<long long> dist(n, INF);\n    priority_queue<pair<long long, int>, vector<pair<long long, int>>, greater<>> pq;\n    dist[src] = 0;\n    pq.push({0, src});\n    while (!pq.empty()) {\n        auto [d, v] = pq.top();\n        pq.pop();\n        if (d > dist[v]) continue;          // an old, longer entry: skip it\n        for (auto [to, w] : g[v]) {\n            if (dist[v] + w < dist[to]) {\n                dist[to] = dist[v] + w;\n                pq.push({dist[to], to});\n            }\n        }\n    }\n    return dist;\n}\n\nint main() {\n    vector<vector<pair<int, int>>> g(4);\n    g[0] = {{1, 1}, {2, 4}};\n    g[1] = {{2, 2}};\n    g[2] = {{3, 1}};\n    vector<long long> d = dijkstra(4, g, 0);\n    for (long long x : d) cout << x << \" \";\n    cout << \"\\n\";                           // prints 0 1 3 4\n    return 0;\n}\n",
    },
    demo: {
      cpp: '',
    },
    practice: [],
  },
  {
    id: "bit-tricks",
    name: "Bit tricks (x & (x - 1))",
    category: "Bit manipulation",
    idea: [
      "Example: 13 is 1101 in binary. Subtract 1 to get 1100, then AND them: 1101 & 1100 = 1100. The lowest 1 bit is gone. Repeat three times and 13 is empty, so 13 has three 1 bits.",
      "General rule: each step removes the lowest set bit. A power of two has only one set bit, so x & (x - 1) is 0 for those numbers.",
    ],
    whenToUse: "You count the 1 bits of a number, check for a power of two, or work with sets of items stored as bit masks.",
    time: "O(number of set bits)",
    space: "O(1)",
    whyItWorks: "Subtracting 1 flips the lowest set bit and every bit below it. The AND keeps only the bits above that point, which removes exactly the lowest set bit.",
    traps: [
      "Using a signed int with negative numbers. Shifts and & behave differently there; use unsigned.",
      "Forgetting that 0 is not a power of two. The check x != 0 is needed.",
      "Shifting by a number of bits that is as large as or larger than the type's width.",
    ],
    code: {
      cpp: "#include <bits/stdc++.h>\nusing namespace std;\n\n// x & (x - 1) clears the lowest set bit of x. Useful for counting bits and for powers of two.\nbool isPowerOfTwo(unsigned long long x) { return x != 0 && (x & (x - 1)) == 0; }\n\nint countBits(unsigned long long x) {\n    int c = 0;\n    while (x) {\n        x &= x - 1;\n        c++;\n    }\n    return c;\n}\n\nint main() {\n    cout << countBits(13) << \"\\n\";                       // 1101 in binary: prints 3\n    cout << boolalpha << isPowerOfTwo(16) << \" \" << isPowerOfTwo(12) << \"\\n\";   // true false\n    return 0;\n}\n",
    },
    demo: {
      cpp: '',
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

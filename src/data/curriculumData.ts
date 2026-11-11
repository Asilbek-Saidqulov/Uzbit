import { MathTheme, CodeExercise } from '../types/index.ts';

export const MATH_THEMES: MathTheme[] = [
  {
    id: 'algebra',
    title: 'Algebra & Polynomial Systems',
    subtitle: 'From Linear Transformations to Quadratic Fields',
    description:
      'Master the language of generalized relations: polynomials, matrix operations, system decompositions, and the fundamental theorem of algebra.',
    iconName: 'FunctionSquare',
    accentColor: 'indigo',
    topics: [
      {
        name: 'Quadratic Discriminant & Root Fields',
        description:
          'Analyze how the sign of Δ = b² - 4ac dictates the bifurcation between two distinct real roots, a singular repeated tangent, or a complex conjugate pair.',
        formula: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}',
        interactiveDemoKey: 'quadratic'
      },
      {
        name: 'Linear Systems & Determinants',
        description:
          'Solve n simultaneous linear relations using Gaussian elimination and geometric row reduction.',
        formula: '\\det(A) = ad - bc \\neq 0',
        interactiveDemoKey: 'matrix'
      },
      {
        name: 'Exponential & Logarithmic Duality',
        description:
          'Model radioactive decay, compounding growth, and information entropy as inverse continuous operations.',
        formula: 'y = a \\cdot e^{kt} \\iff t = \\frac{1}{k}\\ln(y/a)',
        interactiveDemoKey: 'exponential'
      }
    ],
    challenge: {
      question:
        'For the quadratic equation 2x² - 8x + 8 = 0, what is the value of the discriminant Δ, and what does it indicate about the roots?',
      options: [
        'Δ = 0, indicating exactly one repeated real root at x = 2',
        'Δ = 16, indicating two distinct real roots at x = 0 and x = 4',
        'Δ = -32, indicating two complex conjugate roots',
        'Δ = 64, indicating rational roots'
      ],
      correctIndex: 0,
      explanation:
        'Δ = b² - 4ac = (-8)² - 4(2)(8) = 64 - 64 = 0. When Δ = 0, the parabola is tangent to the x-axis, yielding one repeated real root: x = -(-8)/(2*2) = 2.'
    }
  },
  {
    id: 'geometry',
    title: 'Euclidean & Spatial Geometry',
    subtitle: 'Shapes, Invariance, and 3D Polyhedral Topology',
    description:
      'Explore coordinate geometry, polygon circumradii, Pythagorean proofs, 3D conical frustums, and Platonic dual symmetries.',
    iconName: 'Shapes',
    accentColor: 'emerald',
    topics: [
      {
        name: 'Pythagorean Hypotenuse & Trigonometric Projections',
        description:
          'Uncover the metric tensor of Euclidean 2-space through right-angle triangles and inscribed circle radii.',
        formula: 'c^2 = a^2 + b^2, \\quad r = \\frac{a + b - c}{2}',
        interactiveDemoKey: 'pythagoras'
      },
      {
        name: 'Regular Polygons & Limit to Circles',
        description:
          'Observe how the perimeter and area of regular n-gons converge to the circular limit 2πR and πR² as n → ∞.',
        formula: 'A_n = \\frac{n}{2} R^2 \\sin(2\\pi / n)',
        interactiveDemoKey: 'polygons'
      },
      {
        name: 'Conical Frustums & Solid Geometry',
        description:
          'Calculate truncated 3D volume, slant heights, and surface area distributions for modern structural engineering.',
        formula: 'V = \\frac{1}{3}\\pi h (R^2 + Rr + r^2)',
        interactiveDemoKey: 'frustum'
      }
    ],
    challenge: {
      question:
        'A regular hexagon is circumscribed by a circle of radius R = 10. What is its exact perimeter?',
      options: [
        '60 (since side length equals radius R = 10)',
        '30√3 ≈ 51.96',
        '62.83 (equal to 2πR)',
        '100'
      ],
      correctIndex: 0,
      explanation:
        'In a regular hexagon, each of the 6 equilateral triangles formed with the center has side length s = R. Thus perimeter P = 6 × 10 = 60.'
    }
  },
  {
    id: 'calculus',
    title: 'Calculus & Real Analysis',
    subtitle: 'Limits, Instantaneous Rates, and Accumulation',
    description:
      'Bridge discrete finite differences to continuous dynamics via epsilon-delta limits, tangent derivative slopes, and Simpson numerical quadrature.',
    iconName: 'TrendingUp',
    accentColor: 'cyan',
    topics: [
      {
        name: 'The Derivative as Instantaneous Tangent Rate',
        description:
          'Watch the secant line between (x, f(x)) and (x+h, f(x+h)) snap into the true tangent line as interval h approaches zero.',
        formula: "f'(x) = \\lim_{h \\to 0} \\frac{f(x+h) - f(x)}{h}",
        interactiveDemoKey: 'tangent'
      },
      {
        name: 'Definite Integrals & Riemann Summation',
        description:
          'Accumulate infinite infinitesimal slices under curved trajectories, computing physical work, flux, and centroid centers.',
        formula: '\\int_a^b f(x)\\,dx = F(b) - F(a)',
        interactiveDemoKey: 'riemann'
      },
      {
        name: 'Taylor Series & Polynomial Approximation',
        description:
          'Approximate complex transcendental curves (sin, cos, exp) around local neighborhoods through factorial-scaled higher derivatives.',
        formula: 'f(x) = \\sum_{n=0}^{\\infty} \\frac{f^{(n)}(a)}{n!}(x - a)^n',
        interactiveDemoKey: 'taylor'
      }
    ],
    challenge: {
      question:
        'What is the instantaneous derivative of f(x) = 3x² - 5x + 4 evaluated at x = 2?',
      options: [
        "f'(2) = 7",
        "f'(2) = 6",
        "f'(2) = 12",
        "f'(2) = 1"
      ],
      correctIndex: 0,
      explanation:
        "The derivative function is f'(x) = 6x - 5. Substituting x = 2 yields f'(2) = 6(2) - 5 = 12 - 5 = 7."
    }
  },
  {
    id: 'trigonometry',
    title: 'Trigonometry & Periodic Waves',
    subtitle: 'Circular Functions, Harmonic Motion, and Phase Space',
    description:
      'Map angular coordinates to orthogonal Cartesian wave displacements: sine, cosine, phase angle shifts, and harmonic resonance.',
    iconName: 'Activity',
    accentColor: 'amber',
    topics: [
      {
        name: 'The Unit Circle Projection',
        description:
          'Trace an angle θ moving along the perimeter of a unit radius circle and observe instantaneous projection onto x (cos θ) and y (sin θ).',
        formula: '\\cos^2(\\theta) + \\sin^2(\\theta) = 1',
        interactiveDemoKey: 'unitcircle'
      },
      {
        name: 'Harmonic Wave Oscillations',
        description:
          'Adjust frequency, amplitude, and phase shifts to synthesize musical harmonics and alternating current signals.',
        formula: 'y(t) = A \\sin(2\\pi f t + \\phi)',
        interactiveDemoKey: 'waves'
      }
    ],
    challenge: {
      question:
        'For an angle θ = 150° (5π/6 radians), what are the coordinates (x, y) on the unit circle?',
      options: [
        '(-√3/2, 1/2)',
        '(-1/2, √3/2)',
        '(√3/2, -1/2)',
        '(-1, 0)'
      ],
      correctIndex: 0,
      explanation:
        'In the second quadrant, cos(150°) = cos(180° - 30°) = -cos(30°) = -√3/2 ≈ -0.866, and sin(150°) = sin(30°) = 1/2 = 0.5.'
    }
  },
  {
    id: 'discrete',
    title: 'Discrete Math & Graph Theory',
    subtitle: 'Logic Gates, Combinatorics, and Topological Networks',
    description:
      'The foundational bedrock of computer science: truth tables, boolean algebra, node-edge connectivity, and shortest path algorithms.',
    iconName: 'Network',
    accentColor: 'violet',
    topics: [
      {
        name: 'Boolean Logic & De Morgan Laws',
        description:
          'Construct computational decision networks using AND, OR, XOR, and inverted NAND gate primitives.',
        formula: '\\neg(A \\land B) \\iff \\neg A \\lor \\neg B',
        interactiveDemoKey: 'logic'
      },
      {
        name: 'Eulerian Paths & Graph Adjacency',
        description:
          'Determine route traversability across vertex bridges without repeating any edges twice.',
        formula: 'V - E + F = 2 \\quad \\text{(Euler Characteristic)}',
        interactiveDemoKey: 'graphs'
      }
    ],
    challenge: {
      question:
        'In a connected planar graph with 6 vertices and 7 edges, how many faces (enclosed regions plus the unbounded exterior) does it have?',
      options: [
        '3 faces (since F = 2 - V + E = 2 - 6 + 7 = 3)',
        '2 faces',
        '5 faces',
        '1 face'
      ],
      correctIndex: 0,
      explanation:
        'By Euler’s planar formula V - E + F = 2, we rearrange: F = 2 - V + E = 2 - 6 + 7 = 3.'
    }
  },
  {
    id: 'probability',
    title: 'Probability & Bayesian Inference',
    subtitle: 'Stochastic Variables, Distributions, and Prior Updates',
    description:
      'Quantify uncertainty through combinatorics, Gaussian bell curves, expectation values, and conditional probability updates.',
    iconName: 'BarChart2',
    accentColor: 'rose',
    topics: [
      {
        name: 'Bayes Theorem & Posterior Belief Updates',
        description:
          'Update probability hypotheses after observing fresh empirical evidence and diagnostic test observations.',
        formula: 'P(A|B) = \\frac{P(B|A)P(A)}{P(B)}',
        interactiveDemoKey: 'bayes'
      },
      {
        name: 'The Normal Gaussian Distribution',
        description:
          'Examine the Central Limit Theorem and how aggregated random variances cluster reliably around standard deviations.',
        formula: 'f(x) = \\frac{1}{\\sigma \\sqrt{2\\pi}} e^{-\\frac{1}{2}(\\frac{x - \\mu}{\\sigma})^2}',
        interactiveDemoKey: 'gaussian'
      }
    ],
    challenge: {
      question:
        'A rare condition has 1% prevalence. A diagnostic test has 90% true positive rate and 10% false positive rate. If a person tests positive, what is the approximate posterior probability they actually have the condition?',
      options: [
        'About 8.3% (surprising base rate effect)',
        '90% (equal to test sensitivity)',
        '50% (50-50 toss)',
        '1% (equal to prior)'
      ],
      correctIndex: 0,
      explanation:
        'Using Bayes theorem: P(C|+) = (0.90 × 0.01) / (0.90 × 0.01 + 0.10 × 0.99) = 0.009 / (0.009 + 0.099) = 0.009 / 0.108 ≈ 8.33%.'
    }
  }
];

export const CODING_EXERCISES: CodeExercise[] = [
  // PYTHON
  {
    id: 'py-beg-fib',
    title: 'Dynamic Fibonacci Sequence',
    language: 'python',
    level: 'beginner',
    themeCategory: 'Algebra & Sequences',
    description:
      'Implement an efficient function fibonacci(n) that returns the n-th Fibonacci number where F(0)=0, F(1)=1, and F(n)=F(n-1)+F(n-2).',
    starterCode: `def fibonacci(n):
    # Calculate the nth Fibonacci number efficiently
    if n <= 0:
        return 0
    if n == 1:
        return 1
    
    a, b = 0, 1
    for _ in range(2, n + 1):
        a, b = b, a + b
    return b
`,
    entryFunction: 'fibonacci',
    hint: 'Use iterative variable swaps (a, b = b, a + b) to achieve O(n) time and O(1) space.',
    testCases: [
      { name: 'n = 0', input: [0], expected: 0 },
      { name: 'n = 1', input: [1], expected: 1 },
      { name: 'n = 7', input: [7], expected: 13 },
      { name: 'n = 12', input: [12], expected: 144 }
    ]
  },
  {
    id: 'py-int-primes',
    title: "Sieve of Eratosthenes",
    language: 'python',
    level: 'intermediate',
    themeCategory: 'Number Theory',
    description:
      'Write a function count_primes(limit) that finds and returns the count of all prime numbers strictly less than the given limit using the classic Sieve algorithm.',
    starterCode: `def count_primes(limit):
    # Return count of prime numbers < limit
    if limit <= 2:
        return 0
    
    is_prime = [True] * limit
    is_prime[0] = is_prime[1] = False
    
    for p in range(2, int(limit**0.5) + 1):
        if is_prime[p]:
            for multiple in range(p * p, limit, p):
                is_prime[multiple] = False
                
    return sum(is_prime)
`,
    entryFunction: 'count_primes',
    hint: 'Initialize a boolean array of size limit and mark multiples starting from p*p up to limit.',
    testCases: [
      { name: 'limit = 10', input: [10], expected: 4 },
      { name: 'limit = 20', input: [20], expected: 8 },
      { name: 'limit = 100', input: [100], expected: 25 }
    ]
  },
  {
    id: 'py-adv-binary-search',
    title: 'Rotated Sorted Array Search',
    language: 'python',
    level: 'advanced',
    themeCategory: 'Search Algorithms',
    description:
      'Given an integer array nums sorted in ascending order and rotated at an unknown pivot, write search(nums, target) to return the index of target, or -1 if not found in O(log n) time.',
    starterCode: `def search(nums, target):
    left, right = 0, len(nums) - 1
    while left <= right:
        mid = (left + right) // 2
        if nums[mid] == target:
            return mid
        # Check if left half is sorted
        if nums[left] <= nums[mid]:
            if nums[left] <= target < nums[mid]:
                right = mid - 1
            else:
                left = mid + 1
        else: # Right half is sorted
            if nums[mid] < target <= nums[right]:
                left = mid + 1
            else:
                right = mid - 1
    return -1
`,
    entryFunction: 'search',
    hint: 'At any pivot, at least one half of the array remains strictly sorted.',
    testCases: [
      { name: 'Target 0 in [4,5,6,7,0,1,2]', input: [[4, 5, 6, 7, 0, 1, 2], 0], expected: 4 },
      { name: 'Target 3 in [4,5,6,7,0,1,2]', input: [[4, 5, 6, 7, 0, 1, 2], 3], expected: -1 },
      { name: 'Single element match [1]', input: [[1], 1], expected: 0 }
    ]
  },
  {
    id: 'py-mast-simpson',
    title: "Numerical Integration (Simpson's Rule)",
    language: 'python',
    level: 'mastery',
    themeCategory: 'Calculus & Scientific Computing',
    description:
      'Implement integrate_polynomial(coeffs, a, b, n) to compute the definite integral of a polynomial whose coefficients are given in descending order [c_k, ..., c_1, c_0] from x=a to x=b using Simpson’s 1/3 Rule.',
    starterCode: `def integrate_polynomial(coeffs, a, b, n=50):
    def eval_poly(x):
        res = 0
        for c in coeffs:
            res = res * x + c
        return res
        
    if n % 2 != 0:
        n += 1
    h = (b - a) / n
    total = eval_poly(a) + eval_poly(b)
    
    for i in range(1, n):
        x = a + i * h
        weight = 4 if i % 2 != 0 else 2
        total += weight * eval_poly(x)
        
    return round((h / 3) * total, 2)
`,
    entryFunction: 'integrate_polynomial',
    hint: 'Simpson’s rule formula: (h/3) * [f(x0) + 4 f(x1) + 2 f(x2) + 4 f(x3) + ... + f(xn)].',
    testCases: [
      { name: 'Integral of x^2 from 0 to 3', input: [[1, 0, 0], 0, 3, 50], expected: 9.0 },
      { name: 'Integral of 2x + 1 from 0 to 4', input: [[2, 1], 0, 4, 50], expected: 20.0 }
    ]
  },

  // JAVASCRIPT / TYPESCRIPT
  {
    id: 'js-beg-pythagoras',
    title: 'Vector Distance & Pythagorean Metric',
    language: 'javascript',
    level: 'beginner',
    themeCategory: 'Geometry & Vectors',
    description:
      'Write a function euclideanDistance(x1, y1, x2, y2) that calculates the straight-line distance between two points in 2D Cartesian space, rounded to 2 decimal places.',
    starterCode: `function euclideanDistance(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.sqrt(dx * dx + dy * dy);
  return Number(dist.toFixed(2));
}
`,
    entryFunction: 'euclideanDistance',
    hint: 'Apply d = √((x2 - x1)² + (y2 - y1)²).',
    testCases: [
      { name: 'Points (0,0) and (3,4)', input: [0, 0, 3, 4], expected: 5 },
      { name: 'Points (1,1) and (4,5)', input: [1, 1, 4, 5], expected: 5 },
      { name: 'Points (-2,-3) and (2,1)', input: [-2, -3, 2, 1], expected: 5.66 }
    ]
  },
  {
    id: 'js-int-matrix',
    title: '2x2 Matrix Inversion & Determinant',
    language: 'javascript',
    level: 'intermediate',
    themeCategory: 'Linear Algebra',
    description:
      'Given a 2x2 matrix [[a, b], [c, d]], return the inverted matrix [[d/det, -b/det], [-c/det, a/det]] rounded to 2 decimal places. Return null if det === 0.',
    starterCode: `function invertMatrix2x2(matrix) {
  const [[a, b], [c, d]] = matrix;
  const det = a * d - b * c;
  if (Math.abs(det) < 1e-9) return null;
  
  return [
    [Number((d / det).toFixed(2)), Number((-b / det).toFixed(2))],
    [Number((-c / det).toFixed(2)), Number((a / det).toFixed(2))]
  ];
}
`,
    entryFunction: 'invertMatrix2x2',
    hint: 'Det = ad - bc. If det is 0, matrix is singular.',
    testCases: [
      {
        name: 'Invert [[4, 7], [2, 6]]',
        input: [[[4, 7], [2, 6]]],
        expected: [[0.6, -0.7], [-0.2, 0.4]]
      },
      {
        name: 'Singular matrix [[1, 2], [2, 4]]',
        input: [[[1, 2], [2, 4]]],
        expected: null
      }
    ]
  },
  {
    id: 'js-adv-convex-hull',
    title: 'Cross Product & Point Orientation',
    language: 'javascript',
    level: 'advanced',
    themeCategory: 'Computational Geometry',
    description:
      'Given three 2D points A, B, and C, calculate the 2D cross product to determine whether traversing from AB to BC turns counter-clockwise (return 1), clockwise (return -1), or is collinear (return 0).',
    starterCode: `function checkOrientation(A, B, C) {
  // Cross product (B.x - A.x)*(C.y - A.y) - (B.y - A.y)*(C.x - A.x)
  const val = (B[0] - A[0]) * (C[1] - A[1]) - (B[1] - A[1]) * (C[0] - A[0]);
  if (Math.abs(val) < 1e-9) return 0;
  return val > 0 ? 1 : -1;
}
`,
    entryFunction: 'checkOrientation',
    hint: 'Positive cross product in standard Cartesian coordinates indicates counter-clockwise orientation.',
    testCases: [
      { name: 'CCW turn', input: [[0, 0], [4, 4], [1, 2]], expected: 1 },
      { name: 'Collinear points', input: [[0, 0], [1, 1], [2, 2]], expected: 0 },
      { name: 'CW turn', input: [[0, 0], [4, 4], [5, 2]], expected: -1 }
    ]
  },
  {
    id: 'js-mast-bezier',
    title: 'Cubic Bézier Curve Point Evaluation',
    language: 'javascript',
    level: 'mastery',
    themeCategory: 'Computer Graphics & Splines',
    description:
      'Implement bezierPoint(p0, p1, p2, p3, t) that evaluates the 2D position along a cubic Bézier curve at parameter t in [0, 1] using Bernstein polynomial basis.',
    starterCode: `function bezierPoint(p0, p1, p2, p3, t) {
  const u = 1 - t;
  const tt = t * t;
  const uu = u * u;
  const uuu = uu * u;
  const ttt = tt * t;

  const x = uuu * p0[0] + 3 * uu * t * p1[0] + 3 * u * tt * p2[0] + ttt * p3[0];
  const y = uuu * p0[1] + 3 * uu * t * p1[1] + 3 * u * tt * p2[1] + ttt * p3[1];

  return [Number(x.toFixed(2)), Number(y.toFixed(2))];
}
`,
    entryFunction: 'bezierPoint',
    hint: 'B(t) = (1-t)³P0 + 3(1-t)²tP1 + 3(1-t)t²P2 + t³P3.',
    testCases: [
      {
        name: 'Start at t=0',
        input: [[0, 0], [10, 20], [20, 20], [30, 0], 0],
        expected: [0, 0]
      },
      {
        name: 'End at t=1',
        input: [[0, 0], [10, 20], [20, 20], [30, 0], 1],
        expected: [30, 0]
      },
      {
        name: 'Midpoint at t=0.5',
        input: [[0, 0], [0, 20], [20, 20], [20, 0], 0.5],
        expected: [10, 15]
      }
    ]
  },

  // C++ EXERCISES
  {
    id: 'cpp-beg-gcd',
    title: 'Euclidean Greatest Common Divisor',
    language: 'cpp',
    level: 'beginner',
    themeCategory: 'Discrete Math',
    description:
      'Implement gcd(a, b) using the Euclidean algorithm where gcd(a, b) = gcd(b, a % b) until b is 0.',
    starterCode: `// C++ Implementation
int gcd(int a, int b) {
    while (b != 0) {
        int temp = b;
        b = a % b;
        a = temp;
    }
    return a;
}
`,
    entryFunction: 'gcd',
    hint: 'Modulo remainder iteration terminates when the remainder reaches 0.',
    testCases: [
      { name: 'gcd(48, 18)', input: [48, 18], expected: 6 },
      { name: 'gcd(101, 10)', input: [101, 10], expected: 1 },
      { name: 'gcd(56, 42)', input: [56, 42], expected: 14 }
    ]
  },

  // RUST EXERCISES
  {
    id: 'rust-int-bitwise',
    title: 'Bitwise Hamming Weight (Popcount)',
    language: 'rust',
    level: 'intermediate',
    themeCategory: 'Computer Architecture & Logic',
    description:
      'Implement count_set_bits(n) that counts the number of 1-bits in the binary representation of an integer using Brian Kernighan’s algorithm in O(k) time where k is the number of set bits.',
    starterCode: `// Rust Implementation
fn count_set_bits(mut n: u32) -> u32 {
    let mut count = 0;
    while n > 0 {
        n &= n - 1; // Clears the lowest set bit
        count += 1;
    }
    count
}
`,
    entryFunction: 'count_set_bits',
    hint: 'n & (n - 1) clears the lowest set bit in each step.',
    testCases: [
      { name: '11 (binary 1011)', input: [11], expected: 3 },
      { name: '128 (binary 10000000)', input: [128], expected: 1 },
      { name: '255 (binary 11111111)', input: [255], expected: 8 }
    ]
  }
];

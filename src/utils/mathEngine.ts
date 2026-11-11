/**
 * Math Engine: Pure mathematical algorithms and geometric calculations
 */

export interface QuadraticResult {
  discriminant: number;
  roots: number[];
  vertex: { x: number; y: number };
  factorization: string;
  hasRealRoots: boolean;
  steps: string[];
}

export interface GeometryResult {
  area: number;
  perimeter: number;
  secondaryMetrics: Record<string, number | string>;
  formula: string;
  stepByStep: string[];
}

export function solveQuadratic(a: number, b: number, c: number): QuadraticResult {
  if (Math.abs(a) < 1e-9) {
    // Linear case: bx + c = 0
    if (Math.abs(b) < 1e-9) {
      return {
        discriminant: 0,
        roots: [],
        vertex: { x: 0, y: c },
        factorization: `${c} = 0 (no variable)`,
        hasRealRoots: false,
        steps: ['Coefficient a and b are both 0. No solution exists.']
      };
    }
    const root = -c / b;
    return {
      discriminant: 0,
      roots: [Number(root.toFixed(4))],
      vertex: { x: root, y: 0 },
      factorization: `${b}(x ${root >= 0 ? '-' : '+'} ${Math.abs(Number(root.toFixed(3)))}) = 0`,
      hasRealRoots: true,
      steps: [
        `Since a = 0, this is a linear equation: ${b}x + ${c} = 0`,
        `Subtract ${c} from both sides: ${b}x = ${-c}`,
        `Divide by ${b}: x = ${Number(root.toFixed(4))}`
      ]
    };
  }

  const d = b * b - 4 * a * c;
  const vx = -b / (2 * a);
  const vy = a * vx * vx + b * vx + c;
  const steps: string[] = [
    `Standard Form: ${a}x² ${b >= 0 ? '+ ' + b : '- ' + Math.abs(b)}x ${c >= 0 ? '+ ' + c : '- ' + Math.abs(c)} = 0`,
    `Step 1: Compute discriminant Δ = b² - 4ac = (${b})² - 4(${a})(${c}) = ${d.toFixed(2)}`
  ];

  if (d > 1e-9) {
    const sqrtD = Math.sqrt(d);
    const r1 = (-b + sqrtD) / (2 * a);
    const r2 = (-b - sqrtD) / (2 * a);
    steps.push(
      `Step 2: Since Δ > 0, there are two distinct real roots.`,
      `x₁ = (-b + √Δ) / 2a = (${-b} + ${sqrtD.toFixed(3)}) / ${2 * a} = ${r1.toFixed(4)}`,
      `x₂ = (-b - √Δ) / 2a = (${-b} - ${sqrtD.toFixed(3)}) / ${2 * a} = ${r2.toFixed(4)}`,
      `Vertex (extrema): (${vx.toFixed(3)}, ${vy.toFixed(3)}) - ${a > 0 ? 'Minimum' : 'Maximum'}`
    );
    return {
      discriminant: Number(d.toFixed(4)),
      roots: [Number(r1.toFixed(4)), Number(r2.toFixed(4))],
      vertex: { x: Number(vx.toFixed(4)), y: Number(vy.toFixed(4)) },
      factorization: `${a !== 1 ? a : ''}(x ${r1 >= 0 ? '-' : '+'} ${Math.abs(Number(r1.toFixed(2)))})(x ${r2 >= 0 ? '-' : '+'} ${Math.abs(Number(r2.toFixed(2)))})`,
      hasRealRoots: true,
      steps
    };
  } else if (Math.abs(d) <= 1e-9) {
    const r = -b / (2 * a);
    steps.push(
      `Step 2: Since Δ = 0, there is exactly one repeated real root.`,
      `x = -b / 2a = ${-b} / ${2 * a} = ${r.toFixed(4)}`,
      `Vertex coincides with the root at (${vx.toFixed(3)}, 0)`
    );
    return {
      discriminant: 0,
      roots: [Number(r.toFixed(4))],
      vertex: { x: Number(vx.toFixed(4)), y: 0 },
      factorization: `${a !== 1 ? a : ''}(x ${r >= 0 ? '-' : '+'} ${Math.abs(Number(r.toFixed(2)))})²`,
      hasRealRoots: true,
      steps
    };
  } else {
    const realPart = -b / (2 * a);
    const imagPart = Math.sqrt(-d) / (2 * Math.abs(a));
    steps.push(
      `Step 2: Since Δ < 0, there are no real roots. Roots are complex conjugates.`,
      `x = ${realPart.toFixed(3)} ± ${imagPart.toFixed(3)}i`,
      `Parabola does not intersect the x-axis. Vertex: (${vx.toFixed(3)}, ${vy.toFixed(3)})`
    );
    return {
      discriminant: Number(d.toFixed(4)),
      roots: [],
      vertex: { x: Number(vx.toFixed(4)), y: Number(vy.toFixed(4)) },
      factorization: `Irreducible over ℝ (Roots: ${realPart.toFixed(2)} ± ${imagPart.toFixed(2)}i)`,
      hasRealRoots: false,
      steps
    };
  }
}

export function calculateRightTriangle(base: number, height: number): GeometryResult {
  const hypotenuse = Math.sqrt(base * base + height * height);
  const area = 0.5 * base * height;
  const perimeter = base + height + hypotenuse;
  const alphaDeg = (Math.atan2(height, base) * 180) / Math.PI;
  const betaDeg = 90 - alphaDeg;

  return {
    area: Number(area.toFixed(4)),
    perimeter: Number(perimeter.toFixed(4)),
    secondaryMetrics: {
      'Hypotenuse (c)': Number(hypotenuse.toFixed(4)),
      'Base Angle (α)': `${alphaDeg.toFixed(2)}°`,
      'Top Angle (β)': `${betaDeg.toFixed(2)}°`,
      'Inradius (r)': Number(((area / (perimeter / 2))).toFixed(4))
    },
    formula: 'Area = ½ × base × height | c² = a² + b²',
    stepByStep: [
      `Given: Base a = ${base}, Height b = ${height}`,
      `1. Hypotenuse via Pythagorean Theorem: c = √(a² + b²) = √(${base}² + ${height}²) = √${(base * base + height * height).toFixed(2)} = ${hypotenuse.toFixed(4)}`,
      `2. Area: A = ½ × a × b = 0.5 × ${base} × ${height} = ${area.toFixed(4)}`,
      `3. Perimeter: P = a + b + c = ${base} + ${height} + ${hypotenuse.toFixed(3)} = ${perimeter.toFixed(4)}`,
      `4. Trigonometric Ratios: sin(α) = ${height}/${hypotenuse.toFixed(3)} = ${(height / hypotenuse).toFixed(4)}, cos(α) = ${(base / hypotenuse).toFixed(4)}`
    ]
  };
}

export function calculateCircle(radius: number): GeometryResult {
  const area = Math.PI * radius * radius;
  const circumference = 2 * Math.PI * radius;
  const diameter = 2 * radius;

  return {
    area: Number(area.toFixed(4)),
    perimeter: Number(circumference.toFixed(4)),
    secondaryMetrics: {
      'Diameter (d)': Number(diameter.toFixed(4)),
      'Circumference (C)': Number(circumference.toFixed(4)),
      'Inscribed Square Area': Number((2 * radius * radius).toFixed(4))
    },
    formula: 'Area = π × r² | Circumference = 2 × π × r',
    stepByStep: [
      `Given: Radius r = ${radius}`,
      `1. Diameter: d = 2r = 2 × ${radius} = ${diameter.toFixed(4)}`,
      `2. Circumference: C = 2πr = 2 × 3.14159 × ${radius} = ${circumference.toFixed(4)}`,
      `3. Surface Area: A = πr² = π × (${radius})² = ${area.toFixed(4)}`
    ]
  };
}

export function calculateRegularPolygon(sides: number, circumradius: number): GeometryResult {
  const n = Math.max(3, Math.round(sides));
  const sideLength = 2 * circumradius * Math.sin(Math.PI / n);
  const apothem = circumradius * Math.cos(Math.PI / n);
  const perimeter = n * sideLength;
  const area = 0.5 * perimeter * apothem;
  const interiorAngle = ((n - 2) * 180) / n;

  return {
    area: Number(area.toFixed(4)),
    perimeter: Number(perimeter.toFixed(4)),
    secondaryMetrics: {
      'Side Length (s)': Number(sideLength.toFixed(4)),
      'Apothem (a)': Number(apothem.toFixed(4)),
      'Interior Angle': `${interiorAngle.toFixed(2)}°`,
      'Total Sum of Angles': `${(n - 2) * 180}°`
    },
    formula: 'Area = ½ × Perimeter × Apothem | s = 2R sin(π/n)',
    stepByStep: [
      `Given: Regular Polygon with n = ${n} sides, Circumradius R = ${circumradius}`,
      `1. Side Length: s = 2R sin(π/${n}) = 2 × ${circumradius} × sin(${(180 / n).toFixed(2)}°) = ${sideLength.toFixed(4)}`,
      `2. Apothem (inradius): a = R cos(π/${n}) = ${circumradius} × cos(${(180 / n).toFixed(2)}°) = ${apothem.toFixed(4)}`,
      `3. Perimeter: P = n × s = ${n} × ${sideLength.toFixed(4)} = ${perimeter.toFixed(4)}`,
      `4. Area: A = ½ × P × a = 0.5 × ${perimeter.toFixed(3)} × ${apothem.toFixed(3)} = ${area.toFixed(4)}`
    ]
  };
}

export function calculateFrustumCone(r1: number, r2: number, height: number): GeometryResult {
  const slantHeight = Math.sqrt(height * height + (r1 - r2) * (r1 - r2));
  const volume = (Math.PI * height / 3) * (r1 * r1 + r1 * r2 + r2 * r2);
  const lateralArea = Math.PI * (r1 + r2) * slantHeight;
  const totalArea = lateralArea + Math.PI * r1 * r1 + Math.PI * r2 * r2;

  return {
    area: Number(totalArea.toFixed(4)),
    perimeter: Number((2 * Math.PI * r1 + 2 * Math.PI * r2).toFixed(4)),
    secondaryMetrics: {
      'Volume (V)': Number(volume.toFixed(4)),
      'Slant Height (s)': Number(slantHeight.toFixed(4)),
      'Lateral Area': Number(lateralArea.toFixed(4)),
      'Top Base Area': Number((Math.PI * r2 * r2).toFixed(4)),
      'Bottom Base Area': Number((Math.PI * r1 * r1).toFixed(4))
    },
    formula: 'V = ⅓ π h (R² + Rr + r²) | A_total = π(R+r)s + πR² + πr²',
    stepByStep: [
      `Given: Bottom radius R = ${r1}, Top radius r = ${r2}, Height h = ${height}`,
      `1. Slant Height: s = √(h² + (R - r)²) = √(${height}² + ${(r1 - r2).toFixed(2)}²) = ${slantHeight.toFixed(4)}`,
      `2. Volume: V = ⅓πh(R² + Rr + r²) = ⅓ × π × ${height} × (${(r1 * r1).toFixed(2)} + ${(r1 * r2).toFixed(2)} + ${(r2 * r2).toFixed(2)}) = ${volume.toFixed(4)}`,
      `3. Lateral Surface Area: A_lat = π(R + r)s = π × ${(r1 + r2).toFixed(2)} × ${slantHeight.toFixed(3)} = ${lateralArea.toFixed(4)}`,
      `4. Total Surface Area: A_tot = A_lat + πR² + πr² = ${totalArea.toFixed(4)}`
    ]
  };
}

/**
 * Numerical Simpson integration for Calculus visualizer
 */
export function numericalSimpson(
  fn: (x: number) => number,
  a: number,
  b: number,
  n: number = 50
): number {
  if (n % 2 !== 0) n++;
  const h = (b - a) / n;
  let sum = fn(a) + fn(b);
  for (let i = 1; i < n; i++) {
    const x = a + i * h;
    sum += fn(x) * (i % 2 === 0 ? 2 : 4);
  }
  return Number(((h / 3) * sum).toFixed(4));
}

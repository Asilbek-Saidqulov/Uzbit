/**
 * Mathematical Expression Parser & Coordinate Analysis Engine
 * Compiles mathematical strings (e.g. "x^2 - 4", "sin(x) + a*x", "sqrt(abs(x))")
 * into executable continuous functions and finds roots, intercepts, and extrema.
 */

export interface CompiledFunction {
  raw: string;
  evaluator: (x: number, vars?: Record<string, number>) => number;
  isValid: boolean;
  error?: string;
}

export interface GraphPoint {
  x: number;
  y: number;
  type: 'root' | 'y-intercept' | 'extremum' | 'intersection' | 'user';
  label: string;
}

/**
 * Normalizes user math syntax to valid JS Math syntax
 * e.g., "x^2" -> "Math.pow(x, 2)", "sin(x)" -> "Math.sin(x)", "2x" -> "2*x"
 */
export function sanitizeMathExpression(expr: string): string {
  let s = expr.trim();
  if (!s) return '0';

  // Strip "y =" or "f(x) =" if user typed an equation assignment
  s = s.replace(/^(?:y|f\s*\(\s*x\s*\))\s*=\s*/i, '');

  // Replace standard constants
  s = s.replace(/\bpi\b/gi, 'Math.PI');
  s = s.replace(/\be\b(?![a-zA-Z0-9_])/g, 'Math.E');

  // Replace implicit multiplication: e.g. 2x -> 2*x, 3sin(x) -> 3*Math.sin(x), )x -> )*x
  s = s.replace(/(\d)\s*([a-zA-Z(])/g, '$1*$2');
  s = s.replace(/\)\s*([a-zA-Z\d(])/g, ')*$1');

  // Replace power operator a^b with Math.pow(a, b)
  // Handle simple powers like x^2, (x+1)^3, or var^n
  while (s.includes('^')) {
    const powerRegex = /([a-zA-Z0-9_.]+|\([^)()]+\))\s*\^\s*([a-zA-Z0-9_.]+|\([^)()]+\))/;
    const match = s.match(powerRegex);
    if (!match) break;
    s = s.replace(match[0], `Math.pow(${match[1]}, ${match[2]})`);
  }

  // Standard Math functions
  const fns = [
    'sin',
    'cos',
    'tan',
    'asin',
    'acos',
    'atan',
    'sinh',
    'cosh',
    'tanh',
    'sqrt',
    'cbrt',
    'abs',
    'log',
    'log10',
    'log2',
    'exp',
    'floor',
    'ceil',
    'round'
  ];

  for (const fn of fns) {
    const re = new RegExp(`\\b${fn}\\b(?=\\s*\\()`, 'g');
    s = s.replace(re, `Math.${fn}`);
  }

  // Support "ln(x)" as "Math.log(x)"
  s = s.replace(/\bln\b(?=\s*\()/g, 'Math.log');

  return s;
}

export function compileExpression(raw: string): CompiledFunction {
  try {
    const sanitized = sanitizeMathExpression(raw);
    // Construct safe function with x and optional variables dictionary
    const fnBody = `
      try {
        const v = vars || {};
        with (v) {
          const res = ${sanitized};
          return (typeof res === 'number' && !isNaN(res)) ? res : NaN;
        }
      } catch (e) {
        return NaN;
      }
    `;

    const evaluator = new Function('x', 'vars', fnBody) as (
      x: number,
      vars?: Record<string, number>
    ) => number;

    // Test run with sample input
    const testVal = evaluator(1, {});
    return {
      raw,
      evaluator,
      isValid: true
    };
  } catch (err: any) {
    return {
      raw,
      evaluator: () => NaN,
      isValid: false,
      error: err.message
    };
  }
}

/**
 * Finds key critical points of a function within [minX, maxX]
 * (roots, y-intercept, local minima & maxima)
 */
export function analyzeFunctionKeyPoints(
  fn: (x: number, vars?: Record<string, number>) => number,
  vars: Record<string, number> = {},
  minX: number = -10,
  maxX: number = 10,
  steps: number = 120
): GraphPoint[] {
  const points: GraphPoint[] = [];
  const stepSize = (maxX - minX) / steps;

  // 1. Y-intercept (x = 0)
  if (minX <= 0 && maxX >= 0) {
    const y0 = fn(0, vars);
    if (!isNaN(y0) && isFinite(y0)) {
      points.push({
        x: 0,
        y: Number(y0.toFixed(3)),
        type: 'y-intercept',
        label: `Y-Int: (0, ${y0.toFixed(2)})`
      });
    }
  }

  // 2. Scan for roots (sign changes) and local extrema (derivative sign changes)
  let prevX = minX;
  let prevY = fn(prevX, vars);
  let prevSlope = NaN;

  for (let i = 1; i <= steps; i++) {
    const currX = minX + i * stepSize;
    const currY = fn(currX, vars);

    if (isNaN(currY) || !isFinite(currY) || isNaN(prevY) || !isFinite(prevY)) {
      prevX = currX;
      prevY = currY;
      prevSlope = NaN;
      continue;
    }

    // Root detection (sign change across zero)
    if (prevY * currY <= 0 && Math.abs(prevY - currY) < 50) {
      // Linear interpolation to approximate root
      const rootX = prevX - prevY * ((currX - prevX) / (currY - prevY || 1e-9));
      if (Math.abs(rootX) > 1e-4) {
        // avoid duplicating y0 if x=0
        points.push({
          x: Number(rootX.toFixed(3)),
          y: 0,
          type: 'root',
          label: `Root: (${rootX.toFixed(2)}, 0)`
        });
      }
    }

    // Extremum detection (slope sign change)
    const currSlope = (currY - prevY) / stepSize;
    if (!isNaN(prevSlope) && prevSlope * currSlope < 0 && Math.abs(currSlope - prevSlope) < 50) {
      const midX = (prevX + currX) / 2;
      const midY = fn(midX, vars);
      if (!isNaN(midY) && isFinite(midY)) {
        const isMax = prevSlope > 0;
        points.push({
          x: Number(midX.toFixed(3)),
          y: Number(midY.toFixed(3)),
          type: 'extremum',
          label: `${isMax ? 'Max' : 'Min'}: (${midX.toFixed(2)}, ${midY.toFixed(2)})`
        });
      }
    }

    prevX = currX;
    prevY = currY;
    prevSlope = currSlope;
  }

  return points;
}

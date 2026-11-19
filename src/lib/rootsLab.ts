/**
 * The landing page's live lab: a quadratic whose coefficients the visitor can change,
 * and the Python program that solves it. When `a` is 0 the program divides by zero, and the
 * terminal shows the same traceback that `python3 roots.py` prints, with the same ^ markers.
 * Pure functions, checked against real Python in tests/unit/python-traceback.test.ts.
 */

export interface LabState {
  a: number;
  b: number;
  c: number;
}

export const LAB_FILE = 'roots.py';
export const FAIL_LINE = 8;

/** The program as the visitor sees it, with their current values on line 3. */
export function labSource({ a, b, c }: LabState): string[] {
  return [
    'import math',
    '',
    `a, b, c = ${a}, ${b}, ${c}`,
    'd = b*b - 4*a*c',
    'if d < 0:',
    '    print("no real roots")',
    'else:',
    '    x1 = (-b + math.sqrt(d)) / (2*a)',
    '    x2 = (-b - math.sqrt(d)) / (2*a)',
    '    print(x1, x2)',
  ];
}

/** How Python prints a float: whole numbers keep their ".0", and negative zero is kept. */
export function pyFloat(x: number): string {
  if (Object.is(x, -0)) return '-0.0';
  return Number.isInteger(x) ? x.toFixed(1) : String(x);
}

export interface LabRun {
  stdout: string[];
  /** The traceback, line by line, when the program fails. */
  traceback?: string[];
  exitCode: number;
}

/** What `python3 roots.py` would print for these values. */
export function runLab(s: LabState): LabRun {
  const { a, b, c } = s;
  const d = b * b - 4 * a * c;
  if (d < 0) return { stdout: ['no real roots'], exitCode: 0 };
  if (a === 0) {
    const source = labSource(s)[FAIL_LINE - 1].trim(); // x1 = (-b + math.sqrt(d)) / (2*a)
    const exprStart = source.indexOf('(');
    const op = source.indexOf(' / ') + 1;
    const marks = ' '.repeat(exprStart) + '~'.repeat(op - exprStart) + '^' + '~'.repeat(source.length - op - 1);
    return {
      stdout: [],
      traceback: [
        'Traceback (most recent call last):',
        `  File "${LAB_FILE}", line ${FAIL_LINE}, in <module>`,
        `    ${source}`,
        `    ${marks}`,
        'ZeroDivisionError: float division by zero',
      ],
      exitCode: 1,
    };
  }
  const r = Math.sqrt(d);
  // Python's -b on the integer 0 is 0, but JavaScript's -0 is negative zero, which changes the sign of a zero root.
  const nb = b === 0 ? 0 : -b;
  const x1 = (nb + r) / (2 * a);
  const x2 = (nb - r) / (2 * a);
  return { stdout: [`${pyFloat(x1)} ${pyFloat(x2)}`], exitCode: 0 };
}

/** The real roots of the quadratic, for marking on the graph. Empty for a = 0 or no real roots. */
export function realRoots({ a, b, c }: LabState): number[] {
  if (a === 0) return [];
  const d = b * b - 4 * a * c;
  if (d < 0) return [];
  const r = Math.sqrt(d);
  return d === 0 ? [-b / (2 * a)] : [(-b + r) / (2 * a), (-b - r) / (2 * a)];
}

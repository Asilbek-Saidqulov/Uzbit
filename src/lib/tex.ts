/**
 * Turns a typed expression such as "f(x) = x^2 - 4*x" into LaTeX for display.
 * Only the simple cases are converted; anything else is left as plain text,
 * which KaTeX still renders. The typed text itself is never changed.
 */
export function expressionToTex(text: string): string {
  return text
    .replace(/\^(-?\d+(?:\.\d+)?)/g, '^{$1}')
    .replace(/\*/g, '\\cdot ');
}

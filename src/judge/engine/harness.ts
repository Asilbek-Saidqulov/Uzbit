import type { JudgeProblem, Language } from '../types';

/**
 * Builds the program that is actually executed.
 * Stdio problems run as written. Function problems get a small harness
 * appended that reads JSON arguments from stdin, calls the entry function,
 * and prints the JSON-encoded result.
 */
export function buildProgram(problem: JudgeProblem, code: string, language: Language): string {
  if (problem.mode !== 'function' || !problem.entryFunction) return code;
  const fn = problem.entryFunction;
  switch (language) {
    case 'python':
      return `${code}

import json as __json, sys as __sys
print(__json.dumps(${fn}(*__json.loads(__sys.stdin.read()))))
`;
    case 'javascript':
    case 'typescript':
      return `${code}

print(JSON.stringify(${fn}(...JSON.parse(readAll()))));
`;
    default:
      return code;
  }
}

/** Starter code shown when a problem has no starter for a language. */
export function defaultStarter(language: Language): string {
  switch (language) {
    case 'python':
      return '# Read from standard input with input(), print the answer with print().\n\n';
    case 'javascript':
    case 'typescript':
      return '// Read one line with input(), everything with readAll(). Print with print().\n\n';
    case 'cpp':
      return '#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n\n    return 0;\n}\n';
    case 'rust':
      return 'use std::io::{self, Read};\n\nfn main() {\n    let mut input = String::new();\n    io::stdin().read_to_string(&mut input).unwrap();\n\n}\n';
  }
}

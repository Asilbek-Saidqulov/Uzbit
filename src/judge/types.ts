export type Language = 'python' | 'javascript' | 'typescript' | 'cpp' | 'rust';

export const LANGUAGE_META: Record<Language, { label: string; file: string; indent: number }> = {
  python: { label: 'Python 3', file: 'main.py', indent: 4 },
  javascript: { label: 'JavaScript', file: 'main.js', indent: 2 },
  typescript: { label: 'TypeScript', file: 'main.ts', indent: 2 },
  cpp: { label: 'C++17', file: 'main.cpp', indent: 4 },
  rust: { label: 'Rust', file: 'main.rs', indent: 4 },
};

/**
 * stdio: the program reads standard input and prints the answer (online-judge style).
 * function: the program defines `entryFunction`; the harness feeds it JSON arguments.
 */
export type ProblemMode = 'stdio' | 'function';
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface TestCase {
  input: string;
  output: string;
  /** Shown in the statement as an example. */
  example?: boolean;
  name?: string;
}

export interface JudgeProblem {
  id: string;
  code: string;
  title: string;
  difficulty: Difficulty;
  tags: string[];
  timeLimitMs: number;
  memoryMb: number;
  statement: string;
  inputSpec: string;
  outputSpec: string;
  hint: string;
  mode: ProblemMode;
  entryFunction?: string;
  languages: Language[];
  starters: Partial<Record<Language, string>>;
  tests: TestCase[];
}

export type RawKind = 'ok' | 'runtime' | 'compile' | 'timeout' | 'unavailable';

export interface RawResult {
  kind: RawKind;
  stdout: string;
  error?: string;
  timeMs: number;
}

export type Verdict =
  | 'accepted'
  | 'wrong_answer'
  | 'runtime_error'
  | 'compile_error'
  | 'time_limit'
  | 'unavailable';

export interface TestOutcome {
  index: number;
  input: string;
  expected: string;
  actual: string;
  passed: boolean;
  timeMs: number;
  error?: string;
  hidden: boolean;
}

export interface JudgeReport {
  verdict: Verdict;
  message: string;
  outcomes: TestOutcome[];
  passed: number;
  total: number;
  maxTimeMs: number;
  /** Raw stdout of the last run, used by the custom-input runner. */
  lastStdout?: string;
}

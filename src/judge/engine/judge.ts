import { buildProgram } from './harness';
import { outputsMatch } from './compare';
import type { JudgeProblem, JudgeReport, Language, RawResult, TestOutcome, Verdict } from '../types';

export type Runner = (req: {
  language: Language;
  code: string;
  stdin: string;
  timeLimitMs: number;
  userLines?: number;
}) => Promise<RawResult>;

/** Reported after every program run, so the terminal can show each one as it finishes. */
export interface RunEvent {
  /** 1-based position among the tests being run. */
  index: number;
  total: number;
  hidden: boolean;
  stdin: string;
  raw: RawResult;
}

export interface JudgeOptions {
  problem: JudgeProblem;
  code: string;
  language: Language;
  /** "run" checks the example tests and shows them. "submit" checks every test. */
  mode: 'run' | 'submit';
  runner: Runner;
  onRun?: (event: RunEvent) => void;
}

/** Only function problems add judge code after the learner's; stdio programs run exactly as written. */
const userLinesOf = (problem: JudgeProblem, code: string): number | undefined =>
  problem.mode === 'function' ? code.split('\n').length : undefined;

/**
 * A hidden test's output and error text can contain its data (for example a ValueError that quotes the input).
 * Only the kind of error and where it happened are kept.
 */
export function redactHidden(raw: RawResult): RawResult {
  const d = raw.diagnostics?.[0];
  const error = raw.kind === 'runtime' && d ? `${d.name} at ${d.file}:${d.line}:${d.column}` : raw.kind === 'runtime' ? 'Runtime error' : raw.error;
  return { ...raw, stdout: '', stream: undefined, error: raw.kind === 'compile' ? raw.error : error };
}

const firstLines = (text: string | undefined, n = 3) =>
  (text ?? '').split('\n').slice(0, n).join('\n').trim();

/**
 * Judges a submission. Hidden test data never leaves this function:
 * outcomes for hidden tests carry no input, expected or actual output.
 */
export async function judgeCode({ problem, code, language, mode, runner, onRun }: JudgeOptions): Promise<JudgeReport> {
  const program = buildProgram(problem, code, language);
  const userLines = userLinesOf(problem, code);
  const tests = mode === 'run' ? problem.tests.filter((t) => t.example) : problem.tests;
  const outcomes: TestOutcome[] = [];
  let verdict: Verdict = 'accepted';
  let message = 'Accepted';

  if (tests.length === 0) {
    return { verdict: 'accepted', message: 'No tests to run.', outcomes, passed: 0, total: 0, maxTimeMs: 0 };
  }

  for (let i = 0; i < tests.length; i++) {
    const test = tests[i];
    const hidden = !test.example;
    const actual = await runner({ language, code: program, stdin: test.input, timeLimitMs: problem.timeLimitMs, userLines });
    const raw = hidden && actual.kind !== 'unavailable' ? redactHidden(actual) : actual;
    onRun?.({ index: i + 1, total: tests.length, hidden, stdin: hidden ? '' : test.input, raw });

    if (raw.kind === 'unavailable') {
      return finish('unavailable', raw.error || 'This language is not available right now.', outcomes, tests.length);
    }
    if (raw.kind === 'compile') {
      outcomes.push({ index: i + 1, input: hidden ? '' : test.input, expected: '', actual: '', passed: false, timeMs: raw.timeMs, hidden,
        error: raw.error, stream: raw.stream, diagnostics: raw.diagnostics, exitCode: raw.exitCode });
      return { ...finish('compile_error', firstLines(raw.error) || 'Compilation failed.', outcomes, tests.length), diagnostics: raw.diagnostics };
    }
    if (raw.kind === 'timeout') {
      outcomes.push({ index: i + 1, input: hidden ? '' : test.input, expected: '', actual: '', passed: false,
        timeMs: raw.timeMs, hidden, error: 'Time limit exceeded', stream: raw.stream, exitCode: raw.exitCode });
      return finish('time_limit', `Time limit exceeded on test ${i + 1} (limit ${problem.timeLimitMs} ms).`, outcomes, tests.length);
    }
    if (raw.kind === 'runtime') {
      outcomes.push({ index: i + 1, input: hidden ? '' : test.input, expected: hidden ? '' : test.output,
        actual: hidden ? '' : raw.stdout, passed: false, timeMs: raw.timeMs, hidden, error: raw.error,
        stream: raw.stream, diagnostics: raw.diagnostics, exitCode: raw.exitCode });
      const where = `on test ${i + 1}`;
      return { ...finish('runtime_error', `Runtime error ${where}: ${raw.error ?? 'unknown error'}`, outcomes, tests.length), diagnostics: raw.diagnostics };
    }

    const passed = outputsMatch(actual.stdout, test.output);
    outcomes.push({
      index: i + 1,
      input: hidden ? '' : test.input,
      expected: hidden ? '' : test.output,
      actual: hidden ? '' : raw.stdout,
      passed,
      timeMs: raw.timeMs,
      hidden,
      stream: raw.stream,
      exitCode: raw.exitCode,
    });

    if (!passed) {
      if (verdict === 'accepted') {
        verdict = 'wrong_answer';
        message = `Wrong answer on test ${i + 1} of ${tests.length}.`;
      }
      if (mode === 'submit') break;
    }
  }

  if (verdict === 'accepted' && mode === 'run') {
    message = `All ${tests.length} example test${tests.length === 1 ? '' : 's'} passed.`;
  }
  const allPassed = outcomes.every((o) => o.passed) && outcomes.length === tests.length;
  if (allPassed) {
    verdict = 'accepted';
    message = mode === 'submit' ? 'All tests passed.' : message;
  }

  return {
    verdict,
    message,
    outcomes,
    passed: outcomes.filter((o) => o.passed).length,
    total: tests.length,
    maxTimeMs: Math.max(0, ...outcomes.map((o) => o.timeMs)),
    lastStdout: outcomes.length ? lastStdoutOf(outcomes) : undefined,
  };
}

function lastStdoutOf(outcomes: TestOutcome[]) {
  const last = outcomes[outcomes.length - 1];
  return last.hidden ? undefined : last.actual;
}

function finish(verdict: Verdict, message: string, outcomes: TestOutcome[], total: number): JudgeReport {
  return {
    verdict,
    message,
    outcomes,
    passed: outcomes.filter((o) => o.passed).length,
    total,
    maxTimeMs: Math.max(0, ...outcomes.map((o) => o.timeMs)),
  };
}

/**
 * Runs the program on the custom input box (the "Kiriş" field).
 * Nothing is compared; the raw output is returned for the user to inspect.
 */
export async function runCustom({
  problem,
  code,
  language,
  stdin,
  runner,
}: {
  problem: JudgeProblem;
  code: string;
  language: Language;
  stdin: string;
  runner: Runner;
}): Promise<RawResult> {
  const program = buildProgram(problem, code, language);
  return runner({ language, code: program, stdin, timeLimitMs: problem.timeLimitMs, userLines: userLinesOf(problem, code) });
}

import { buildProgram } from './harness';
import { outputsMatch } from './compare';
import type { JudgeProblem, JudgeReport, Language, RawResult, TestOutcome, Verdict } from '../types';

export type Runner = (req: {
  language: Language;
  code: string;
  stdin: string;
  timeLimitMs: number;
}) => Promise<RawResult>;

export interface JudgeOptions {
  problem: JudgeProblem;
  code: string;
  language: Language;
  /** "run" checks the example tests and shows them. "submit" checks every test. */
  mode: 'run' | 'submit';
  runner: Runner;
}

const firstLines = (text: string | undefined, n = 3) =>
  (text ?? '').split('\n').slice(0, n).join('\n').trim();

/**
 * Judges a submission. Hidden test data never leaves this function:
 * outcomes for hidden tests carry no input, expected or actual output.
 */
export async function judgeCode({ problem, code, language, mode, runner }: JudgeOptions): Promise<JudgeReport> {
  const program = buildProgram(problem, code, language);
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
    const raw = await runner({ language, code: program, stdin: test.input, timeLimitMs: problem.timeLimitMs });

    if (raw.kind === 'unavailable') {
      return finish('unavailable', raw.error || 'This language is not available right now.', outcomes, tests.length);
    }
    if (raw.kind === 'compile') {
      return finish('compile_error', firstLines(raw.error) || 'Compilation failed.', outcomes, tests.length);
    }
    if (raw.kind === 'timeout') {
      outcomes.push({ index: i + 1, input: hidden ? '' : test.input, expected: '', actual: '', passed: false,
        timeMs: raw.timeMs, hidden, error: 'Time limit exceeded' });
      return finish('time_limit', `Time limit exceeded on test ${i + 1} (limit ${problem.timeLimitMs} ms).`, outcomes, tests.length);
    }
    if (raw.kind === 'runtime') {
      outcomes.push({ index: i + 1, input: hidden ? '' : test.input, expected: hidden ? '' : test.output,
        actual: hidden ? '' : raw.stdout, passed: false, timeMs: raw.timeMs, hidden, error: raw.error });
      const where = `on test ${i + 1}`;
      return finish('runtime_error', `Runtime error ${where}: ${raw.error ?? 'unknown error'}`, outcomes, tests.length);
    }

    const passed = outputsMatch(raw.stdout, test.output);
    outcomes.push({
      index: i + 1,
      input: hidden ? '' : test.input,
      expected: hidden ? '' : test.output,
      actual: hidden ? '' : raw.stdout,
      passed,
      timeMs: raw.timeMs,
      hidden,
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
  return runner({ language, code: program, stdin, timeLimitMs: problem.timeLimitMs });
}

import type { Language, RawResult } from '../types';
import { parseCompilerOutput, parseRustPanic } from './diagnostics';

/** Maps a Judge0 submission result onto the judge's raw result kinds, keeping the compiler's own text. */
export function mapJudge0(body: any, language?: Language): RawResult {
  const statusId: number = body?.status?.id ?? 0;
  const timeMs = Math.round(Number(body?.time ?? 0) * 1000);
  const stdout: string = body?.stdout ?? '';
  const stderr: string = body?.stderr ?? '';
  const compile: string = body?.compile_output ?? '';
  const withStdout = (extra: string) => {
    const stream = [] as { fd: 1 | 2; text: string }[];
    if (stdout) stream.push({ fd: 1, text: stdout });
    if (extra) stream.push({ fd: 2, text: extra.endsWith('\n') ? extra : extra + '\n' });
    return stream;
  };

  if (statusId === 6) {
    const text = compile || 'Compilation failed.';
    const diagnostics = parseCompilerOutput(text, language);
    const first = diagnostics.find((d) => d.severity === 'error') ?? diagnostics[0];
    return {
      kind: 'compile',
      stdout: '',
      stream: withStdout(text).filter((c) => c.fd === 2),
      diagnostics,
      exitCode: 1,
      error: first ? `${first.file}:${first.line}:${first.column}: ${first.name}: ${first.message}` : text,
      timeMs,
    };
  }
  if (statusId === 5) return { kind: 'timeout', stdout, stream: withStdout(''), exitCode: 124, timeMs };
  if (statusId === 3 || statusId === 4) return { kind: 'ok', stdout, stream: withStdout(''), exitCode: 0, timeMs };
  if (statusId >= 7 && statusId <= 12) {
    const description: string = body?.status?.description || 'Runtime error';
    const text = stderr || description;
    return {
      kind: 'runtime',
      stdout,
      stream: withStdout(text),
      diagnostics: parseRustPanic(stderr),
      exitCode: Number(body?.exit_code ?? 1) || 1,
      error: stderr.split('\n').find((l) => l.trim()) || description,
      timeMs,
    };
  }
  return { kind: 'unavailable', stdout, error: body?.status?.description || 'The judge service failed.', timeMs };
}

import type { RawResult } from '../types';

/** Maps a Judge0 submission result onto the judge's raw result kinds. */
export function mapJudge0(body: any): RawResult {
  const statusId: number = body?.status?.id ?? 0;
  const timeMs = Math.round(Number(body?.time ?? 0) * 1000);
  const stdout: string = body?.stdout ?? '';
  const stderr: string = body?.stderr ?? '';
  const compile: string = body?.compile_output ?? '';

  if (statusId === 6) return { kind: 'compile', stdout: '', error: compile || 'Compilation failed.', timeMs };
  if (statusId === 5) return { kind: 'timeout', stdout, timeMs };
  if (statusId === 3 || statusId === 4) return { kind: 'ok', stdout, timeMs };
  if (statusId >= 7 && statusId <= 12) {
    return { kind: 'runtime', stdout, error: stderr || body?.status?.description || 'Runtime error', timeMs };
  }
  return { kind: 'unavailable', stdout, error: body?.status?.description || 'The judge service failed.', timeMs };
}


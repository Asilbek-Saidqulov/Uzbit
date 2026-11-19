import WORKER_SOURCE from './worker.js?raw';
import PY_BOOT from './boot.py?raw';
import type { Language, RawResult, StreamChunk } from '../types';
import { buildRawResult, joinStream, type WorkerReply } from './diagnostics';
import { mapJudge0 } from './judge0';

export interface RunRequest {
  language: Language;
  code: string;
  stdin: string;
  timeLimitMs: number;
  /** How many lines at the start of `code` are the learner's own (the rest is the judge's harness). */
  userLines?: number;
}

interface Pending {
  id: number;
  resolve: (r: RawResult) => void;
  started: number;
  /** Output seen so far, kept so a stopped or timed-out run still shows what it printed. */
  partial: StreamChunk[];
  req: RunRequest;
}

let worker: Worker | null = null;
let workerUrl: string | null = null;
let seq = 0;
let pythonWarm = false;
let pending: Pending | null = null;

/** What a run that never finished printed before it was stopped. */
function partialResult(p: Pending, kind: 'timeout'): RawResult {
  return { kind, stdout: joinStream(p.partial, 1), stream: p.partial, exitCode: 124, timeMs: Math.round(performance.now() - p.started) };
}

/** Absolute base of the app, so the worker can fetch /pyodide and /vendor. */
function assetBase(): string {
  const base: string = (import.meta as any).env?.BASE_URL || '/';
  return new URL(base, window.location.href).href;
}

function getWorker(): Worker {
  if (!worker) {
    if (!workerUrl) {
      const source = WORKER_SOURCE.replace("'__ASSET_BASE__'", () => JSON.stringify(assetBase())).replace("'__PY_BOOT__'", () => JSON.stringify(PY_BOOT));
      workerUrl = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
    }
    worker = new Worker(workerUrl);
    worker.onmessage = (event: MessageEvent<WorkerReply | { id: number; chunk: StreamChunk }>) => {
      const reply = event.data;
      if (!pending || pending.id !== reply.id) return;
      if ('chunk' in reply) {
        const last = pending.partial[pending.partial.length - 1];
        if (last && last.fd === reply.chunk.fd) last.text += reply.chunk.text;
        else pending.partial.push({ ...reply.chunk });
        return;
      }
      const done = pending;
      pending = null;
      const program = done.req.code;
      done.resolve(
        buildRawResult(reply, {
          language: done.req.language,
          program,
          userLines: done.req.userLines,
          timeMs: Math.round(performance.now() - done.started),
        })
      );
    };
    worker.onerror = (event) => {
      const done = pending;
      pending = null;
      terminateWorker();
      done?.resolve({
        kind: 'runtime',
        stdout: '',
        error: event.message || 'The sandbox failed to start.',
        stream: [{ fd: 2, text: (event.message || 'The sandbox failed to start.') + '\n' }],
        timeMs: 0,
      });
    };
  }
  return worker;
}

function terminateWorker() {
  worker?.terminate();
  worker = null;
}

/** Stops a long-running program. The next run starts a fresh worker. */
export function cancelRun() {
  if (!pending) return;
  const done = pending;
  pending = null;
  terminateWorker();
  done.resolve(partialResult(done, 'timeout'));
}

function runInWorker(req: RunRequest): Promise<RawResult> {
  // The first Python run downloads the interpreter, so give it extra time.
  const extra = req.language === 'python' && !pythonWarm ? 60_000 : 0;
  const budget = req.timeLimitMs + extra;
  const id = ++seq;
  const w = getWorker();

  return new Promise<RawResult>((resolve) => {
    const started = performance.now();
    const timer = window.setTimeout(() => {
      if (pending && pending.id === id) {
        const done = pending;
        pending = null;
        terminateWorker();
        resolve(partialResult(done, 'timeout'));
      }
    }, budget);

    pending = {
      id,
      started,
      partial: [],
      req,
      resolve: (result) => {
        window.clearTimeout(timer);
        if (req.language === 'python' && result.kind !== 'timeout') pythonWarm = true;
        resolve(result);
      },
    };
    w.postMessage({ id, language: req.language, code: req.code, stdin: req.stdin, userLines: req.userLines });
  });
}

/**
 * Judge0 language ids (https://ce.judge0.com). C++ and Rust need a native
 * compiler, which must never run inside this app's server. They are sent to
 * a server proxy (api/judge0.ts) configured with VITE_JUDGE0_URL=/api/judge0. The proxy holds the
 * RapidAPI key, so the browser never sees it.
 */
const JUDGE0_LANGUAGE_ID: Partial<Record<Language, number>> = {
  cpp: 54, // C++ (GCC)
  rust: 73, // Rust
};

const JUDGE0_URL: string | undefined = (import.meta as any).env?.VITE_JUDGE0_URL || undefined;

export const NATIVE_RUNNER_CONFIGURED = Boolean(JUDGE0_URL);

async function runNative(req: RunRequest): Promise<RawResult> {
  const languageId = JUDGE0_LANGUAGE_ID[req.language];
  if (!JUDGE0_URL || !languageId) {
    return {
      kind: 'unavailable',
      stdout: '',
      error:
        'C++ and Rust need a sandboxed judge service. Set VITE_JUDGE0_URL to a self-hosted Judge0 instance to enable them.',
      timeMs: 0,
    };
  }
  try {
    const response = await fetch(JUDGE0_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source_code: req.code,
        language_id: languageId,
        stdin: req.stdin,
        cpu_time_limit: Math.max(1, req.timeLimitMs / 1000),
      }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      const detail = typeof body?.detail === 'string' && body.detail ? ' ' + body.detail.slice(0, 200) : '';
      return { kind: 'unavailable', stdout: '', error: `Judge service returned HTTP ${response.status}.${detail}`, timeMs: 0 };
    }
    return mapJudge0(await response.json(), req.language);
  } catch (err: any) {
    return { kind: 'unavailable', stdout: '', error: 'Cannot reach the judge service: ' + err.message, timeMs: 0 };
  }
}

/** Runs one program against one stdin. Never throws. */
export function runProgram(req: RunRequest): Promise<RawResult> {
  if (req.language === 'cpp' || req.language === 'rust') return runNative(req);
  return runInWorker(req);
}
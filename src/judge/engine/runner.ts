import WORKER_SOURCE from './worker.js?raw';
import type { Language, RawResult } from '../types';
import { mapJudge0 } from './judge0';

export interface RunRequest {
  language: Language;
  code: string;
  stdin: string;
  timeLimitMs: number;
}

interface WorkerReply {
  id: number;
  kind: 'ok' | 'runtime' | 'compile';
  stdout: string;
  error?: string;
}

let worker: Worker | null = null;
let workerUrl: string | null = null;
let seq = 0;
let pythonWarm = false;
let pending: { id: number; resolve: (r: RawResult) => void; started: number } | null = null;

/** Absolute base of the app, so the worker can fetch /pyodide and /vendor. */
function assetBase(): string {
  const base: string = (import.meta as any).env?.BASE_URL || '/';
  return new URL(base, window.location.href).href;
}

function getWorker(): Worker {
  if (!worker) {
    if (!workerUrl) {
      const source = WORKER_SOURCE.replace("'__ASSET_BASE__'", JSON.stringify(assetBase()));
      workerUrl = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
    }
    worker = new Worker(workerUrl);
    worker.onmessage = (event: MessageEvent<WorkerReply>) => {
      const reply = event.data;
      if (!pending || pending.id !== reply.id) return;
      const done = pending;
      pending = null;
      done.resolve({
        kind: reply.kind,
        stdout: reply.stdout,
        error: reply.error,
        timeMs: Math.round(performance.now() - done.started),
      });
    };
    worker.onerror = (event) => {
      const done = pending;
      pending = null;
      terminateWorker();
      done?.resolve({
        kind: 'runtime',
        stdout: '',
        error: event.message || 'The sandbox failed to start.',
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
  done.resolve({ kind: 'timeout', stdout: '', timeMs: Math.round(performance.now() - done.started) });
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
        pending = null;
        terminateWorker();
        resolve({ kind: 'timeout', stdout: '', timeMs: Math.round(performance.now() - started) });
      }
    }, budget);

    pending = {
      id,
      started,
      resolve: (result) => {
        window.clearTimeout(timer);
        if (req.language === 'python' && result.kind !== 'timeout') pythonWarm = true;
        resolve(result);
      },
    };
    w.postMessage({ id, language: req.language, code: req.code, stdin: req.stdin });
  });
}

/**
 * Judge0 language ids (https://ce.judge0.com). C++ and Rust need a native
 * compiler, which must never run inside this app's server. They are sent to
 * a separately hosted, sandboxed Judge0 instance configured with VITE_JUDGE0_URL.
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
    const response = await fetch(`${JUDGE0_URL.replace(/\/$/, '')}/submissions?base64_encoded=false&wait=true`, {
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
      return { kind: 'unavailable', stdout: '', error: `Judge service returned HTTP ${response.status}.`, timeMs: 0 };
    }
    return mapJudge0(await response.json());
  } catch (err: any) {
    return { kind: 'unavailable', stdout: '', error: 'Cannot reach the judge service: ' + err.message, timeMs: 0 };
  }
}

/** Runs one program against one stdin. Never throws. */
export function runProgram(req: RunRequest): Promise<RawResult> {
  if (req.language === 'cpp' || req.language === 'rust') return runNative(req);
  return runInWorker(req);
}

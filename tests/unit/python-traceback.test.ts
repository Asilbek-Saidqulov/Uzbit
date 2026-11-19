import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadPyodide, type PyodideInterface } from 'pyodide';
import { buildRawResult, type WorkerReply } from '../../src/judge/engine/diagnostics.ts';
import type { StreamChunk } from '../../src/judge/types.ts';

/** Runs the real boot.py on the real Pyodide, the same way worker.js does. */
let py: PyodideInterface;
let runner: (code: string, userLines: number | null) => string;

before(async () => {
  py = await loadPyodide();
  py.runPython(readFileSync('src/judge/engine/boot.py', 'utf8'));
  runner = py.globals.get('__uzbit_run');
});

function run(code: string, stdin = '', userLines?: number) {
  const stream: StreamChunk[] = [];
  const dec = { 1: new TextDecoder(), 2: new TextDecoder() };
  const add = (fd: 1 | 2, text: string) => {
    const last = stream[stream.length - 1];
    if (last && last.fd === fd) last.text += text;
    else stream.push({ fd, text });
  };
  py.setStdout({ write: (b: Uint8Array) => (add(1, dec[1].decode(b, { stream: true })), b.length) });
  py.setStderr({ write: (b: Uint8Array) => (add(2, dec[2].decode(b, { stream: true })), b.length) });
  const lines = stdin.split('\n');
  if (lines[lines.length - 1] === '') lines.pop();
  let i = 0;
  py.setStdin({ stdin: () => (i < lines.length ? lines[i++] : undefined) });
  const report = JSON.parse(runner(code, userLines ?? null));
  const reply: WorkerReply = report.ok
    ? { id: 1, kind: 'ok', stream }
    : { id: 1, kind: report.py.syntax ? 'compile' : 'runtime', stream, py: report.py };
  return buildRawResult(reply, { language: 'python', program: code, userLines, timeMs: 1 });
}
const err = (r: { stream?: StreamChunk[] }) => (r.stream ?? []).filter((c) => c.fd === 2).map((c) => c.text).join('');

test('a normal program prints exactly what it writes, with no trailing newline added', () => {
  const r = run('print("a", end="")\nprint("b")\nimport sys\nsys.stderr.write("warn\\n")\n');
  assert.equal(r.kind, 'ok');
  assert.equal(r.stdout, 'ab\n');
  assert.equal(err(r), 'warn\n');
});

test('input() reads lines from stdin and reports the end of input like Python does', () => {
  assert.equal(run('print(int(input()) + int(input()))', '2\n3\n').stdout, '5\n');
  const r = run('input()\ninput()\n', 'only\n');
  assert.equal(r.kind, 'runtime');
  assert.match(err(r), /EOFError: EOF when reading a line/);
  assert.equal(r.diagnostics![0].line, 2);
});

test('a runtime error prints Python\'s own traceback with file, line and column markers', () => {
  const r = run('print("start")\n\ndef f(a, b):\n    return a / b\n\nf(1, 0)\n');
  assert.equal(r.kind, 'runtime');
  assert.equal(r.stdout, 'start\n');
  const text = err(r);
  assert.match(text, /^Traceback \(most recent call last\):\n {2}File "main\.py", line 6, in <module>\n {4}f\(1, 0\)\n/);
  assert.match(text, /File "main\.py", line 4, in f\n {4}return a \/ b\n {11}~~\^~~\nZeroDivisionError: division by zero\n$/);
  assert.ok(!text.includes('_pyodide'), 'no internals in the traceback');
  const d = r.diagnostics![0];
  assert.deepEqual([d.name, d.file, d.line, d.column, d.endColumn], ['ZeroDivisionError', 'main.py', 4, 12, 17]);
  assert.match(r.error!, /^ZeroDivisionError: division by zero \(main\.py:4:12\)$/);
});

test('a syntax error is a compile error with the column of the problem', () => {
  const r = run('x = 1\nprint("hi"\ny = 2\n');
  assert.equal(r.kind, 'compile');
  const text = err(r);
  assert.match(text, /^ {2}File "main\.py", line 2\n {4}print\("hi"\n/);
  assert.match(text, /SyntaxError: '\(' was never closed\n$/);
  assert.ok(!text.includes('Traceback'));
  const d = r.diagnostics![0];
  assert.deepEqual([d.name, d.line, d.column], ['SyntaxError', 2, 6]);
});

test('an indentation error points at the line', () => {
  const r = run('def f():\nreturn 1\n');
  assert.equal(r.kind, 'compile');
  assert.equal(r.diagnostics![0].name, 'IndentationError');
  assert.equal(r.diagnostics![0].line, 2);
});

test('columns count characters, not bytes, on lines with non-ASCII text', () => {
  const r = run('s = "салом"\nprint(s + 1)\n');
  assert.equal(r.kind, 'runtime');
  assert.equal(r.diagnostics![0].line, 2);
  assert.equal(r.diagnostics![0].column, 7); // the "s + 1" expression starts at column 7
});

test('sys.exit with a non-zero code is a failure with that exit code, and exit(0) is fine', () => {
  assert.equal(run('import sys\nsys.exit(0)\n').kind, 'ok');
  const r = run('import sys\nsys.exit(3)\n');
  assert.equal(r.kind, 'runtime');
  assert.equal(r.exitCode, 3);
});

test('function problems: the harness is judge.py and its lines never mark the editor', () => {
  const user = 'def solve(x):\n    return x[5]\n';
  const program = user + '\n\nprint(solve([1]))\n';
  const r = run(program, '', user.split('\n').length);
  assert.equal(r.kind, 'runtime');
  const text = err(r);
  assert.match(text, /File "judge\.py", line 1, in <module>\n {4}print\(solve\(\[1\]\)\)/);
  assert.match(text, /File "main\.py", line 2, in solve/);
  assert.match(text, /IndexError: list index out of range/);
  assert.equal(r.diagnostics![0].line, 2);
  assert.equal(r.diagnostics![0].file, 'main.py');
});

test('a run starts clean: names from one run are not visible in the next', () => {
  run('leak = 1\n');
  const r = run('print("leak" in globals())\n');
  assert.equal(r.stdout, 'False\n');
});

/* ---------- the landing page's lab must print what real Python prints ---------- */
import { labSource, runLab, LAB_FILE } from '../../src/lib/rootsLab.ts';

test('the landing lab prints exactly what python3 prints, for every setting of its sliders', () => {
  let checked = 0;
  for (let a = -3; a <= 3; a++)
    for (let b = -6; b <= 6; b++)
      for (let c = -6; c <= 6; c++) {
        const state = { a, b, c };
        const real = run(labSource(state).join('\n') + '\n');
        const shown = runLab(state);
        if (shown.traceback) {
          assert.equal(real.kind, 'runtime', JSON.stringify(state));
          assert.equal(err(real), shown.traceback.join('\n').replace(LAB_FILE, 'main.py') + '\n', JSON.stringify(state));
          assert.equal(shown.exitCode, 1);
        } else {
          assert.equal(real.kind, 'ok', JSON.stringify(state));
          assert.equal(real.stdout, shown.stdout.join('\n') + '\n', JSON.stringify(state));
        }
        checked++;
      }
  assert.equal(checked, 7 * 13 * 13);
});

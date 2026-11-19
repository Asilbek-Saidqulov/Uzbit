import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import {
  buildRawResult,
  classifyErrorLine,
  decodeMappings,
  linkParts,
  originalPosition,
  parseCompilerOutput,
  parseGcc,
  parseJsStack,
  parseRustPanic,
  parseRustc,
  streamToLines,
  type WorkerReply,
} from '../../src/judge/engine/diagnostics.ts';
import { mapJudge0 } from '../../src/judge/engine/judge0.ts';
import { redactHidden } from '../../src/judge/engine/judge.ts';

/* ---------- run the real worker.js in a Node VM ---------- */

const WORKER = readFileSync('src/judge/engine/worker.js', 'utf8')
  .replace("'__ASSET_BASE__'", () => JSON.stringify('/'))
  .replace("'__PY_BOOT__'", () => JSON.stringify(readFileSync('src/judge/engine/boot.py', 'utf8')));
const TS_SOURCE = readFileSync('node_modules/typescript-judge/lib/typescript.js', 'utf8');

function runWorker(language: string, code: string, stdin = '', userLines?: number): Promise<WorkerReply> {
  return new Promise((resolve) => {
    const sandbox: any = {
      postMessage: (m: any) => {
        if (!m.chunk) resolve(m);
      },
      TextDecoder,
      importScripts: (url: string) => {
        if (!url.endsWith('typescript.js')) throw new Error('not available in tests');
        vm.runInContext(TS_SOURCE, sandbox);
      },
    };
    sandbox.self = sandbox;
    vm.createContext(sandbox);
    vm.runInContext(WORKER, sandbox);
    sandbox.onmessage({ data: { id: 1, language, code, stdin, userLines } });
  });
}

const run = async (language: 'javascript' | 'typescript', code: string, userLines?: number, stdin = '') => {
  const reply = await runWorker(language, code, stdin, userLines);
  return buildRawResult(reply, { language, program: code, userLines, timeMs: 1 });
};
const stderrOf = (r: { stream?: { fd: number; text: string }[] }) => (r.stream ?? []).filter((c) => c.fd === 2).map((c) => c.text).join('');

/* ---------- JavaScript ---------- */

test('JavaScript: a runtime error names the file, line, column and prints the source with a caret', async () => {
  const code = 'function f(o) {\n  return o.a.b;\n}\nprint("start");\nf({});\n';
  const r = await run('javascript', code);
  assert.equal(r.kind, 'runtime');
  assert.equal(r.stdout.trim(), 'start');
  const d = r.diagnostics![0];
  assert.equal(d.name, 'TypeError');
  assert.equal(d.file, 'main.js');
  assert.equal(d.line, 2);
  assert.equal(d.column, 14); // V8 points at the property that failed, as Node does
  const text = stderrOf(r);
  assert.match(text, /^main\.js:2\n {2}return o\.a\.b;\n {13}\^\n\nTypeError: /);
  assert.match(text, /at f \(main\.js:2:14\)/);
  assert.match(text, /at Object\.<anonymous> \(main\.js:5:1\)/);
});

test('JavaScript: a column on line 1 is not shifted by the wrapper', async () => {
  const r = await run('javascript', 'null.x;');
  assert.equal(r.diagnostics![0].line, 1);
  assert.equal(r.diagnostics![0].column, 6);
});

test('JavaScript: a syntax error points at the place and keeps the engine message', async () => {
  const r = await run('javascript', 'let a = 1;\nlet b = ;\nprint(a);\n');
  assert.equal(r.kind, 'compile');
  const d = r.diagnostics![0];
  assert.equal(d.name, 'SyntaxError');
  assert.equal(d.line, 2);
  assert.ok(d.column >= 9 && d.column <= 10, `column ${d.column}`);
  assert.match(stderrOf(r), /^main\.js:2\nlet b = ;\n/);
});

test('JavaScript: console.error goes to stderr and print goes to stdout, in order', async () => {
  const r = await run('javascript', 'print("a"); console.error("b"); print("c");');
  assert.deepEqual(JSON.parse(JSON.stringify(r.stream)), [
    { fd: 1, text: 'a\n' },
    { fd: 2, text: 'b\n' },
    { fd: 1, text: 'c\n' },
  ]);
  assert.equal(r.stdout, 'a\nc\n');
});

test('JavaScript: the end of stdin is reported like a real error', async () => {
  const r = await run('javascript', 'input(); input();', undefined, 'only one line\n');
  assert.equal(r.kind, 'runtime');
  assert.match(r.error!, /no more lines on standard input/);
});

test('JavaScript: harness lines are named judge.js and never marked in the editor', async () => {
  const user = 'function f() { return 1; }\n';
  const program = user + '\nprint(g());\n'; // g is missing, as if the entry function were misnamed
  const r = await run('javascript', program, user.split('\n').length);
  assert.equal(r.kind, 'runtime');
  assert.equal(r.diagnostics!.length, 0);
  assert.match(stderrOf(r), /^judge\.js:1\nprint\(g\(\)\);/);
});

test('JavaScript: each run starts with fresh globals', async () => {
  await run('javascript', 'var leak = 1;');
  const r = await run('javascript', 'print(typeof leak);');
  assert.equal(r.stdout.trim(), 'undefined');
});

/* ---------- TypeScript ---------- */

test('TypeScript: a syntax error is reported the way tsc prints it', async () => {
  const r = await run('typescript', 'const a: number = 1;\nconst b: number = ;\n');
  assert.equal(r.kind, 'compile');
  const d = r.diagnostics![0];
  assert.equal(d.file, 'main.ts');
  assert.equal(d.line, 2);
  assert.match(d.name, /^TS\d+$/);
  const text = stderrOf(r);
  assert.match(text, /^main\.ts:2:\d+ - error TS\d+: /);
  assert.match(text, /2 const b: number = ;\n\s+~/);
});

test('TypeScript: a runtime error maps back to the TypeScript line, not the compiled one', async () => {
  const code = 'interface Point {\n  x: number;\n  y: number;\n}\ntype Id = string;\nfunction boom(p: Point): number {\n  return (null as any).x + p.y;\n}\nboom({ x: 1, y: 2 });\n';
  const r = await run('typescript', code);
  assert.equal(r.kind, 'runtime');
  const d = r.diagnostics![0];
  assert.equal(d.file, 'main.ts');
  assert.equal(d.line, 7);
  assert.match(stderrOf(r), /^main\.ts:7\n {2}return \(null as any\)\.x/);
});

/* ---------- pure helpers ---------- */

test('stack parsing reads Chrome and Firefox formats and skips other frames', () => {
  assert.deepEqual(
    parseJsStack('Error: x\n    at fib (main.js:2:9)\n    at main.js:5:1\n    at Array.map (<anonymous>)'),
    [
      { fn: 'fib', line: 2, column: 9 },
      { fn: '', line: 5, column: 1 },
    ]
  );
  assert.deepEqual(parseJsStack('fib@main.js:2:9\n@main.js:5:1'), [
    { fn: 'fib', line: 2, column: 9 },
    { fn: '', line: 5, column: 1 },
  ]);
});

test('source maps decode and find the original position', () => {
  // "AAAA;AACA" : line 1 -> src 1:1, line 2 -> src 2:1
  const m = decodeMappings('AAAA;AACA');
  assert.deepEqual(originalPosition(m, 1, 1), { line: 1, column: 1 });
  assert.deepEqual(originalPosition(m, 2, 1), { line: 2, column: 1 });
  assert.equal(originalPosition(m, 9, 1), null);
});

test('GCC output gives file, line and column', () => {
  const text = "main.cpp: In function 'int main()':\nmain.cpp:5:13: error: expected ';' before '}' token\n    5 |   int x = 1\n      |             ^\nmain.cpp:7:3: warning: unused variable 'y' [-Wunused-variable]\n";
  const d = parseGcc(text);
  assert.equal(d.length, 2);
  assert.deepEqual([d[0].file, d[0].line, d[0].column, d[0].severity], ['main.cpp', 5, 13, 'error']);
  assert.equal(d[1].severity, 'warning');
});

test('rustc output gives code, location and underline length', () => {
  const text = "error[E0425]: cannot find value `y` in this scope\n --> main.rs:3:20\n  |\n3 |     println!(\"{}\", y);\n  |                    ^ not found in this scope\n\nerror: aborting due to 1 previous error\n";
  const d = parseRustc(text);
  assert.equal(d.length, 1);
  assert.deepEqual([d[0].name, d[0].file, d[0].line, d[0].column, d[0].endColumn], ['E0425', 'main.rs', 3, 20, 21]);
  assert.equal(parseCompilerOutput(text, 'rust').length, 1);
  assert.equal(parseCompilerOutput(text, 'cpp').length, 0);
});

test('a Rust panic names its own place', () => {
  const d = parseRustPanic("thread 'main' panicked at src/main.rs:4:13:\nattempt to divide by zero\n");
  assert.deepEqual([d[0].file, d[0].line, d[0].column, d[0].message], ['main.rs', 4, 13, 'attempt to divide by zero']);
});

test('Judge0 compile errors keep the compiler text and its locations', () => {
  const r = mapJudge0({ status: { id: 6 }, compile_output: "main.cpp:2:5: error: 'x' was not declared in this scope\n" }, 'cpp');
  assert.equal(r.kind, 'compile');
  assert.equal(r.diagnostics![0].line, 2);
  assert.match(r.stream![0].text, /was not declared/);
});

test('links are found in tracebacks, node output and compiler output', () => {
  assert.deepEqual(linkParts('  File "main.py", line 7, in <module>')[1].link, { line: 7, column: 1 });
  assert.deepEqual(linkParts('    at f (main.js:2:12)')[1].link, { line: 2, column: 12 });
  assert.deepEqual(linkParts(' --> main.rs:3:20')[1].link, { line: 3, column: 20 });
  assert.equal(linkParts('nothing here').length, 1);
  assert.equal(linkParts('File "judge.py", line 2')[0].link, undefined);
});

test('output is split into lines and keeps which stream each came from', () => {
  const lines = streamToLines([
    { fd: 1, text: 'a\nb' },
    { fd: 1, text: 'c\n' },
    { fd: 2, text: 'oops\n' },
  ]);
  assert.deepEqual(lines, [
    { fd: 1, text: 'a' },
    { fd: 1, text: 'bc' },
    { fd: 2, text: 'oops' },
  ]);
});

test('error lines are classified for colouring', () => {
  assert.equal(classifyErrorLine('    ~^~'), 'caret');
  assert.equal(classifyErrorLine('Traceback (most recent call last):'), 'traceback');
  assert.equal(classifyErrorLine('  File "main.py", line 2, in <module>'), 'file');
  assert.equal(classifyErrorLine('ZeroDivisionError: division by zero'), 'error');
  assert.equal(classifyErrorLine('hello'), 'plain');
});

test('hidden tests never expose output or the message of an error', () => {
  const raw = redactHidden({
    kind: 'runtime',
    stdout: 'secret',
    stream: [{ fd: 2, text: "ValueError: invalid literal for int(): 'secret'" }],
    error: "ValueError: invalid literal for int(): 'secret' (main.py:3:5)",
    diagnostics: [{ severity: 'error', name: 'ValueError', message: "invalid literal for int(): 'secret'", file: 'main.py', line: 3, column: 5 }],
    timeMs: 4,
  });
  assert.equal(raw.stdout, '');
  assert.equal(raw.stream, undefined);
  assert.equal(raw.error, 'ValueError at main.py:3:5');
});

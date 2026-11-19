import test from 'node:test';
import assert from 'node:assert';
import { checkProxyRequest, MAX_CPU_TIME_SECONDS, MAX_SOURCE_CHARS } from '../../src/judge/engine/proxyRules.ts';

const good = { source_code: 'int main(){}', language_id: 54, stdin: '', cpu_time_limit: 3 };

test('a normal C++ request is forwarded with exactly the allowed fields', () => {
  const r = checkProxyRequest({ ...good, extra: 'dropped' });
  assert.deepStrictEqual(r, { ok: true, value: good });
});

test('languages other than C++ and Rust are refused', () => {
  assert.strictEqual(checkProxyRequest({ ...good, language_id: 71 }).ok, false);
  assert.strictEqual(checkProxyRequest({ ...good, language_id: '54' }).ok, false);
});

test('empty or oversized source is refused', () => {
  assert.strictEqual(checkProxyRequest({ ...good, source_code: '' }).ok, false);
  assert.strictEqual(checkProxyRequest({ ...good, source_code: 'x'.repeat(MAX_SOURCE_CHARS + 1) }).ok, false);
});

test('CPU time is clamped to a safe range, and defaults when missing', () => {
  const big = checkProxyRequest({ ...good, cpu_time_limit: 9999 });
  assert.ok(big.ok && big.value.cpu_time_limit === MAX_CPU_TIME_SECONDS);
  const small = checkProxyRequest({ ...good, cpu_time_limit: -4 });
  assert.ok(small.ok && small.value.cpu_time_limit === 1);
  const none = checkProxyRequest({ source_code: 'x', language_id: 54 });
  assert.ok(none.ok && none.value.cpu_time_limit === 5 && none.value.stdin === '');
});

test('non-object bodies are refused', () => {
  assert.strictEqual(checkProxyRequest(null).ok, false);
  assert.strictEqual(checkProxyRequest([good]).ok, false);
  assert.strictEqual(checkProxyRequest('code').ok, false);
});

import { toBase64, fromBase64, decodeJudge0Result } from '../../src/judge/engine/proxyRules';

test('base64 round-trips UTF-8 text, including compiler quotes and newlines', () => {
  const text = "main.cpp:5: error: expected ‘;’ before ‘cout’\nпривет ✓\n";
  assert.equal(fromBase64(toBase64(text)), text);
  assert.equal(fromBase64(null), null);
});

test('decodeJudge0Result decodes text fields and leaves the rest alone', () => {
  const out = decodeJudge0Result({
    token: 't',
    status: { id: 6 },
    time: null,
    compile_output: toBase64("error: expected ‘;’"),
    stdout: null,
    stderr: toBase64('x'),
  });
  assert.equal(out.compile_output, 'error: expected ‘;’');
  assert.equal(out.stdout, null);
  assert.equal(out.stderr, 'x');
  assert.equal(out.token, 't');
  assert.deepEqual(out.status, { id: 6 });
});

test('fromBase64 tolerates line-wrapped base64 and invalid UTF-8 bytes', () => {
  const wrapped = toBase64('hello world').replace(/(.{4})/g, '$1\n');
  assert.equal(fromBase64(wrapped), 'hello world');
  assert.equal(fromBase64(btoa(String.fromCharCode(0x68, 0xff, 0x69))), 'h\uFFFDi');
});
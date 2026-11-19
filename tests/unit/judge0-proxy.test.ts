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

import test from 'node:test';
import assert from 'node:assert/strict';
import { EditorState } from '@codemirror/state';
import { CompletionContext } from '@codemirror/autocomplete';
import { cpp } from '@codemirror/lang-cpp';
import { python } from '@codemirror/lang-python';
import { rust } from '@codemirror/lang-rust';
import { javascript } from '@codemirror/lang-javascript';
import { lintState } from '../../src/judge/engine/liveLint.ts';
import { completionList, completionsFor } from '../../src/judge/engine/completions.ts';
import type { Language } from '../../src/judge/types.ts';

const support = { cpp: cpp(), python: python(), rust: rust(), javascript: javascript(), typescript: javascript({ typescript: true }) };
const stateFor = (language: Language, doc: string) => EditorState.create({ doc, extensions: [support[language]] });

test('lintState turns a missing quote into an error diagnostic inside the document', () => {
  const doc = 'int main() {\n    cout << "hello;\n}\n';
  const out = lintState(stateFor('cpp', doc), 'cpp');
  assert.equal(out.length, 1);
  assert.equal(out[0].severity, 'error');
  assert.equal(doc.slice(out[0].from, out[0].to), '"hello;');
});

test('lintState uses the real parser for Python and marks a missing colon', () => {
  const doc = 'for i in range(3)\n    print(i)\n';
  const out = lintState(stateFor('python', doc), 'python');
  assert.equal(out.length, 1);
  assert.equal(doc.slice(out[0].from, out[0].to), ')');
});

test('lintState is silent on valid code, empty input, and always stays inside the document', () => {
  assert.deepEqual(lintState(stateFor('cpp', 'int main() { return 0; }\n'), 'cpp'), []);
  assert.deepEqual(lintState(stateFor('cpp', ''), 'cpp'), []);
  for (const doc of ['(', '"', "'", '{', 'x = (', '`', '/*']) {
    for (const language of ['cpp', 'python', 'rust', 'javascript', 'typescript'] as const) {
      for (const d of lintState(stateFor(language, doc), language)) {
        assert.ok(d.from >= 0 && d.to <= doc.length && d.from < d.to, `${language} ${JSON.stringify(doc)} -> ${d.from}-${d.to}`);
      }
    }
  }
});

const complete = (language: Language, before: string) => {
  const state = stateFor(language, before);
  return completionsFor(language)(new CompletionContext(state, before.length, false)) as ReturnType<ReturnType<typeof completionsFor>>;
};

test('typing "fo" in C++ offers the loop snippets, and "vec" offers vector', () => {
  const labels = (r: any) => (r?.options ?? []).map((o: any) => o.label);
  assert.ok(labels(complete('cpp', 'int main() {\n    fo')).includes('fori'));
  assert.ok(labels(complete('cpp', 'int main() {\n    vec')).includes('vector'));
  assert.ok(labels(complete('rust', 'fn main() {\n    pri')).includes('println'));
});

test('no suggestions inside strings and comments', () => {
  assert.equal(complete('cpp', 'string s = "fo'), null);
  assert.equal(complete('cpp', '// fo'), null);
});

test('completion lists have no duplicate labels, and every snippet is insertable', () => {
  for (const language of ['cpp', 'rust', 'python', 'javascript'] as const) {
    const list = completionList(language);
    const seen = new Set<string>();
    for (const c of list) {
      assert.ok(!seen.has(c.label), `${language}: duplicate ${c.label}`);
      seen.add(c.label);
    }
    assert.ok(list.some((c) => typeof c.apply === 'function'), `${language} has snippets`);
  }
});

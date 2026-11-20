import test from 'node:test';
import assert from 'node:assert/strict';
import { cppLanguage } from '@codemirror/lang-cpp';
import { pythonLanguage } from '@codemirror/lang-python';
import { javascriptLanguage, typescriptLanguage } from '@codemirror/lang-javascript';
import { rustLanguage } from '@codemirror/lang-rust';
import { liveIssues, scanText, type SyntaxTreeLike } from '../../src/judge/engine/liveCheck.ts';
import { ALGORITHMS } from '../../src/judge/data/algorithms.ts';
import { PROBLEMS, SANDBOX } from '../../src/judge/data/problems.ts';
import { defaultStarter } from '../../src/judge/engine/harness.ts';
import type { Language } from '../../src/judge/types.ts';

const parsers: Record<Language, { parse(input: string): SyntaxTreeLike }> = {
  cpp: cppLanguage.parser,
  python: pythonLanguage.parser,
  javascript: javascriptLanguage.parser,
  typescript: typescriptLanguage.parser,
  rust: rustLanguage.parser,
};
const check = (language: Language, text: string) => liveIssues(language, text, parsers[language].parse(text));
const messages = (language: Language, text: string) => check(language, text).map((i) => i.message);
const slice = (text: string, i: { from: number; to: number }) => text.slice(i.from, i.to);

/* ----- missing quotes ----- */

test('C++: a string with no closing quote is flagged from the quote to the end of the line', () => {
  const code = 'int main() {\n    cout << "hello;\n    return 0;\n}\n';
  const issues = check('cpp', code);
  assert.equal(issues.length, 1);
  assert.match(issues[0].message, /closing double quote/);
  assert.equal(slice(code, issues[0]), '"hello;');
  assert.equal(issues[0].severity, 'error');
});

test('C++: a character literal with no closing quote is flagged', () => {
  const issues = check('cpp', "int main() {\n    char c = 'a;\n    return 0;\n}\n");
  assert.equal(issues.length, 1);
  assert.match(issues[0].message, /single quote/);
});

test('C++: quotes inside comments, other strings and digit separators are fine', () => {
  const code = `#include <bits/stdc++.h>
// don't panic
/* it's "fine" */
int main() {
    const char* s = "it's";
    char q = '"';
    long long big = 1'000'000'007;
    string r = R"x(he said "hi" and ( )x";
    return 0;
}
`;
  assert.deepEqual(check('cpp', code), []);
});

test('Python: single, double and triple quotes', () => {
  assert.match(messages('python', 'print("hi)\n')[0], /double quote/);
  assert.match(messages('python', "print('hi)\n")[0], /single quote/);
  assert.match(messages('python', 'x = """never ends\nmore\n')[0], /"""/);
  assert.deepEqual(check('python', 'x = """fine\nover lines"""\nprint(\'it"s\')\n# don\'t\n'), []);
});

test('JavaScript: strings, template literals and regular expressions', () => {
  assert.match(messages('javascript', 'const s = "abc;\n')[0], /double quote/);
  assert.match(messages('javascript', 'const s = `abc ${1 + 1\n')[0], /placeholder|backtick/);
  assert.deepEqual(check('javascript', 'const a = `x ${[1, 2].map((v) => `<${v}>`).join(",")} y`;\nconst r = /["\'(]+/g;\nconst n = 4 / 2 / 1;\n'), []);
});

test('Rust: lifetimes and characters are not mistaken for open quotes', () => {
  const code = `fn longest<'a>(a: &'a str, b: &'a str) -> &'a str { if a.len() > b.len() { a } else { b } }
fn main() {
    let c = 'x';
    let nl = '\\n';
    let s = "multi
line";
    println!("{} {} {}", c, nl, s);
}
`;
  assert.deepEqual(check('rust', code), []);
  assert.match(messages('rust', 'fn main() {\n    let s = "abc;\n}\n')[0], /double quote/);
});

/* ----- brackets ----- */

test('a missing closing brace is reported on its opening brace', () => {
  const code = 'int main() {\n    if (true) {\n        return 0;\n}\n';
  const issues = check('cpp', code);
  assert.equal(issues.length, 1);
  assert.match(issues[0].message, /Missing '}'/);
  // The stray last } closes the innermost brace, so the one left open is main's.
  assert.equal(issues[0].from, code.indexOf('{'));
});

test('a missing ) is reported on its (, without a pile of follow-up errors', () => {
  const code = 'int main() {\n    foo(1, 2;\n    return 0;\n}\n';
  const issues = check('cpp', code);
  assert.equal(issues.length, 1);
  assert.match(issues[0].message, /Missing '\)'/);
  assert.equal(slice(code, issues[0]), '(');
});

test('an extra closing bracket is reported', () => {
  const code = 'int main() {\n    return 0;\n}\n}\n';
  const issues = check('cpp', code);
  assert.equal(issues.length, 1);
  assert.match(issues[0].message, /Unexpected '}'/);
});

test('brackets inside strings, comments and C++ macros are ignored', () => {
  const code = '#define OPEN {\nint main() {\n    string s = "({[";\n    // )))\n    /* ]] */\n    return 0;\n}\n';
  assert.deepEqual(check('cpp', code), []);
});

test('an unterminated block comment is reported', () => {
  assert.match(messages('cpp', 'int main() {\n/* oops\n}\n')[0], /Unterminated comment/);
});

/* ----- C++ missing semicolon ----- */

test('C++: a statement line with no semicolon is flagged on its last token', () => {
  const code = '#include <bits/stdc++.h>\nusing namespace std;\nint main() {\n    int a = 5\n    cout << a << "\\n";\n    return 0;\n}\n';
  const issues = check('cpp', code);
  assert.equal(issues.length, 1);
  assert.match(issues[0].message, /Expected ';'/);
  assert.equal(slice(code, issues[0]), '5');
});

test('C++: missing semicolons before a closing brace, after return and after a call', () => {
  assert.equal(check('cpp', 'int f() {\n    return 1\n}\n').length, 1);
  assert.equal(check('cpp', 'int main() {\n    foo(1)\n    bar(2);\n    return 0;\n}\n').length, 1);
  assert.equal(check('cpp', 'using namespace std\nint main() { return 0; }\n').length, 1);
});

test('C++: a missing semicolon after an initializer list or an enum is flagged', () => {
  assert.equal(check('cpp', 'int main() {\n    vector<int> a = {1, 2, 3}\n    return 0;\n}\n').length, 1);
  assert.equal(check('cpp', 'enum Color { RED, GREEN }\nint main() { return 0; }\n').length, 1);
});

test('C++: braces after case labels, extern and lambdas are blocks, not initializers', () => {
  const code = `extern "C" {
int f();
}
int main(int argc, char** argv) {
    switch (argc) {
        case 1: {
            int a = 1;
            break;
        }
        case 2: {
            break;
        }
        default: {
            break;
        }
    }
    auto g = [] {
        return 1;
    };
    return g();
}
`;
  assert.deepEqual(check('cpp', code), []);
});

test('C++: valid multi-line code is not flagged', () => {
  const code = `#include <bits/stdc++.h>
#define rep(i, n) for (int i = 0; i < (n); i++)
#define IOS ios::sync_with_stdio(false); cin.tie(nullptr);
using namespace std;
template <typename T>
T add(T a, T b)
{
    return a + b;
}
struct P {
    int x, y;
    bool operator<(const P& o) const { return x < o.x; }
};
enum Color { RED, GREEN, BLUE };
int main()
{
    IOS
    vector<int> v = {
        1, 2,
        3
    };
    map<string, int> m = {
        {"a", 1},
        {"b", 2}
    };
    int n = v.size();
    if (n > 2)
        cout << "big\\n";
    else
        cout << "small\\n";
    for (int i = 0; i < n; i++)
        cout << v[i]
             << " ";
    rep(i, n)
        cout << i;
    long long total = v[0]
        + v[1]
        + v[2];
    const char* msg = "a"
                      "b";
    auto f = [&](int x)
    {
        return x * 2;
    };
    sort(v.begin(), v.end(), [](int a, int b) {
        return a > b;
    });
    while (n--)
    {
        cout << n;
    }
    do {
        n++;
    } while (n < 3);
    switch (n) {
        case 1:
            break;
        default:
            break;
    }
    [[maybe_unused]]
    int unused = 0;
    cout << total << f(1) << msg << "\\n";
    return 0;
}
`;
  assert.deepEqual(check('cpp', code), []);
});

/* ----- parser errors for the other languages ----- */

test('Python: a missing colon is marked at the end of the def line', () => {
  const code = 'def f(x)\n    return x\n';
  const issues = check('python', code);
  assert.equal(issues.length, 1);
  assert.equal(slice(code, issues[0]), ')');
});

test('JavaScript: a missing parenthesis is found by the scanner, not left to the parser', () => {
  assert.match(messages('javascript', 'function f(a { return a }\n')[0], /Missing '\)'/);
});

test('Rust: a missing semicolon is a warning from the parser', () => {
  const issues = check('rust', 'fn main() {\n    let a = 5\n    println!("{}", a);\n}\n');
  assert.equal(issues.length, 1);
  assert.equal(issues[0].severity, 'warning');
});

/* ----- no false alarms on real code ----- */

test('every starter, and every library algorithm in every language, produces no live issues', () => {
  const samples: { name: string; language: Language; code: string }[] = [];
  for (const p of [...PROBLEMS, SANDBOX]) {
    for (const language of p.languages) {
      samples.push({ name: `starter ${p.id}/${language}`, language, code: p.starters[language] ?? defaultStarter(language) });
    }
  }
  for (const a of ALGORITHMS) {
    for (const [language, code] of Object.entries(a.code) as [Language, string][]) {
      samples.push({ name: `algorithm ${a.id}/${language}`, language, code });
      const demo = a.demo[language];
      if (demo) samples.push({ name: `algorithm+demo ${a.id}/${language}`, language, code: `${code}\n${demo}\n` });
    }
  }
  assert.ok(samples.length > 40, 'the corpus should be large');
  const bad = samples
    .map((s) => ({ s, issues: check(s.language, s.code) }))
    .filter((r) => r.issues.length > 0)
    .map((r) => `${r.s.name}: ${r.issues.map((i) => `${i.message} @ ${JSON.stringify(r.s.code.slice(Math.max(0, i.from - 20), i.to + 20))}`).join(' | ')}`);
  assert.deepEqual(bad, []);
});

test('scanText on empty input and on a huge line is fast and quiet', () => {
  assert.deepEqual(scanText('cpp', ''), []);
  const long = 'int x = ' + '1 + '.repeat(20000) + '1;\n';
  const t0 = Date.now();
  assert.deepEqual(scanText('cpp', long), []);
  assert.ok(Date.now() - t0 < 500);
});

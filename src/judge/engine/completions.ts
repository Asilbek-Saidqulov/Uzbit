/**
 * Extra autocomplete entries, on top of what each language package already offers.
 *
 * C++ and Rust get the most, because their language packages suggest nothing at all: keywords,
 * the standard library names used in practice problems, and snippets with tab stops (type `fori`,
 * press Enter, then Tab between the parts). Python and JavaScript already complete their own
 * keywords and names, so they only get snippets for reading input.
 */
import { completeFromList, ifNotIn, snippetCompletion, type Completion, type CompletionSource } from '@codemirror/autocomplete';
import { EditorState, type Extension } from '@codemirror/state';
import type { Language } from '../types';

/** Syntax nodes where suggestions would only be noise. */
const QUIET_NODES = ['String', 'RawString', 'TemplateString', 'CharLiteral', 'Comment', 'LineComment', 'BlockComment'];

const word = (label: string, type: Completion['type'], detail?: string): Completion => ({ label, type, detail });
const snip = (template: string, label: string, detail: string, type: Completion['type'] = 'keyword'): Completion =>
  snippetCompletion(template, { label, detail, type });

const CPP: Completion[] = [
  // Snippets
  snip('#include <${bits/stdc++.h}>', 'include', 'include a header'),
  snip(
    '#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n\n    ${}\n    return 0;\n}\n',
    'main',
    'full program with fast input'
  ),
  snip('for (int ${i} = 0; ${i} < ${n}; ${i}++) {\n    ${}\n}', 'fori', 'counting loop'),
  snip('for (int ${i} = ${n} - 1; ${i} >= 0; ${i}--) {\n    ${}\n}', 'forr', 'loop downwards'),
  snip('for (auto& ${x} : ${v}) {\n    ${}\n}', 'foreach', 'range-based for'),
  snip('while (${cond}) {\n    ${}\n}', 'while', 'while loop'),
  snip('if (${cond}) {\n    ${}\n}', 'if', 'if statement'),
  snip('if (${cond}) {\n    ${}\n} else {\n    ${}\n}', 'ifelse', 'if / else'),
  snip('int ${n};\ncin >> ${n};', 'readint', 'read one integer'),
  snip('vector<int> ${a}(${n});\nfor (int ${i} = 0; ${i} < ${n}; ${i}++) cin >> ${a}[${i}];', 'readvec', 'read n integers'),
  snip('cout << ${x} << "\\n";', 'cout', 'print a line'),
  snip('sort(${v}.begin(), ${v}.end());', 'sortv', 'sort a vector'),
  snip('struct ${Name} {\n    ${}\n};', 'struct', 'struct'),
  snip('auto ${f} = [&](${int x}) {\n    ${}\n};', 'lambda', 'lambda function'),
  snip('long long ${answer} = 0;', 'll', 'long long variable'),
  // Keywords
  ...['if', 'else', 'for', 'while', 'do', 'switch', 'case', 'default', 'break', 'continue', 'return', 'const', 'constexpr', 'static', 'struct', 'class', 'enum', 'typedef', 'using', 'namespace', 'template', 'typename', 'auto', 'true', 'false', 'nullptr', 'new', 'delete', 'operator', 'public', 'private', 'unsigned', 'signed'].map((k) => word(k, 'keyword')),
  // Types
  ...['int', 'long long', 'unsigned long long', 'double', 'float', 'char', 'bool', 'void', 'string', 'size_t', 'int64_t', 'uint64_t', 'int32_t'].map((k) => word(k, 'type')),
  word('vector', 'type', 'dynamic array'),
  word('array', 'type', 'fixed array'),
  word('pair', 'type', 'two values'),
  word('tuple', 'type', 'several values'),
  word('map', 'type', 'sorted key → value'),
  word('unordered_map', 'type', 'hash key → value'),
  word('set', 'type', 'sorted unique values'),
  word('unordered_set', 'type', 'hash set'),
  word('multiset', 'type', 'sorted values with repeats'),
  word('queue', 'type', 'first in, first out'),
  word('deque', 'type', 'double-ended queue'),
  word('stack', 'type', 'last in, first out'),
  word('priority_queue', 'type', 'largest on top'),
  word('bitset', 'type', 'fixed bits'),
  // Input and output
  word('cin', 'variable', 'standard input'),
  word('cout', 'variable', 'standard output'),
  word('cerr', 'variable', 'standard error'),
  word('endl', 'variable', 'newline and flush'),
  word('getline', 'function', 'read a whole line'),
  word('printf', 'function'),
  word('scanf', 'function'),
  word('boolalpha', 'function', 'print true / false'),
  word('setprecision', 'function', 'decimal places'),
  word('fixed', 'function', 'fixed-point output'),
  // Algorithms and numbers
  word('sort', 'function', 'sort a range'),
  word('reverse', 'function', 'reverse a range'),
  word('unique', 'function', 'drop equal neighbours'),
  word('accumulate', 'function', 'sum a range'),
  word('max', 'function'),
  word('min', 'function'),
  word('max_element', 'function'),
  word('min_element', 'function'),
  word('swap', 'function'),
  word('abs', 'function'),
  word('gcd', 'function', 'greatest common divisor'),
  word('lcm', 'function', 'least common multiple'),
  word('lower_bound', 'function', 'first element ≥ x'),
  word('upper_bound', 'function', 'first element > x'),
  word('binary_search', 'function'),
  word('next_permutation', 'function'),
  word('iota', 'function', 'fill 0, 1, 2, …'),
  word('fill', 'function'),
  word('memset', 'function'),
  word('count', 'function'),
  word('find', 'function'),
  word('sqrt', 'function'),
  word('pow', 'function'),
  word('floor', 'function'),
  word('ceil', 'function'),
  word('to_string', 'function'),
  word('stoi', 'function', 'string → int'),
  word('stoll', 'function', 'string → long long'),
  word('make_pair', 'function'),
  word('push_back', 'method', 'append'),
  word('emplace_back', 'method', 'append in place'),
  word('pop_back', 'method'),
  word('size', 'method'),
  word('empty', 'method'),
  word('begin', 'method'),
  word('end', 'method'),
  word('front', 'method'),
  word('back', 'method'),
  word('insert', 'method'),
  word('erase', 'method'),
  word('first', 'property'),
  word('second', 'property'),
];

const RUST: Completion[] = [
  snip('use std::io::{self, Read};\n\nfn main() {\n    let mut input = String::new();\n    io::stdin().read_to_string(&mut input).unwrap();\n    ${}\n}\n', 'main', 'program that reads all input'),
  snip('fn ${name}(${arg}: ${i64}) -> ${i64} {\n    ${}\n}', 'fn', 'function'),
  snip('for ${i} in 0..${n} {\n    ${}\n}', 'fori', 'counting loop'),
  snip('for ${x} in ${v}.iter() {\n    ${}\n}', 'foreach', 'loop over a vector'),
  snip('while ${cond} {\n    ${}\n}', 'while', 'while loop'),
  snip('if ${cond} {\n    ${}\n}', 'if', 'if statement'),
  snip('if ${cond} {\n    ${}\n} else {\n    ${}\n}', 'ifelse', 'if / else'),
  snip('match ${value} {\n    ${pattern} => ${},\n    _ => ${},\n}', 'match', 'match expression'),
  snip('let ${v}: Vec<i64> = input.split_whitespace().map(|x| x.parse().unwrap()).collect();', 'readvec', 'parse all numbers'),
  snip('println!("{}", ${x});', 'println', 'print a line'),
  snip('struct ${Name} {\n    ${field}: ${i64},\n}', 'struct', 'struct'),
  snip('impl ${Name} {\n    ${}\n}', 'impl', 'methods'),
  ...['let', 'mut', 'const', 'fn', 'if', 'else', 'for', 'while', 'loop', 'match', 'return', 'break', 'continue', 'struct', 'enum', 'impl', 'trait', 'use', 'mod', 'pub', 'as', 'in', 'true', 'false', 'self', 'Self'].map((k) => word(k, 'keyword')),
  ...['i32', 'i64', 'u32', 'u64', 'usize', 'isize', 'f64', 'bool', 'char', 'String', 'Vec', 'HashMap', 'HashSet', 'BTreeMap', 'BTreeSet', 'VecDeque', 'BinaryHeap', 'Option', 'Result'].map((k) => word(k, 'type')),
  ...['Some', 'None', 'Ok', 'Err'].map((k) => word(k, 'constant')),
  ...['unwrap', 'expect', 'parse', 'collect', 'iter', 'map', 'filter', 'sum', 'len', 'push', 'pop', 'sort', 'sort_unstable', 'reverse', 'abs', 'pow', 'min', 'max', 'split_whitespace', 'lines', 'trim', 'to_string', 'clone'].map((k) => word(k, 'method')),
  word('println', 'function', 'print a line'),
  word('print', 'function'),
  word('format', 'function'),
  word('vec', 'function', 'vec![…]'),
];

const PYTHON: Completion[] = [
  snip('n = int(input())', 'readint', 'read one integer'),
  snip('${a} = list(map(int, input().split()))', 'readlist', 'read a line of integers'),
  snip('for ${i} in range(${n}):\n    ${}', 'fori', 'counting loop'),
  snip('def ${name}(${args}):\n    ${}', 'def', 'function'),
  snip('if __name__ == "__main__":\n    ${}', 'main', 'entry point'),
];

const JAVASCRIPT: Completion[] = [
  word('readAll', 'function', 'all of standard input'),
  word('input', 'function', 'one line of input'),
  word('print', 'function', 'print a line'),
  snip('const ${a} = readAll().trim().split(/\\s+/).map(Number);', 'readnums', 'read all numbers'),
  snip('for (let ${i} = 0; ${i} < ${n}; ${i}++) {\n    ${}\n}', 'fori', 'counting loop'),
];

/** Keeps the first entry for each label, so a snippet such as `if` replaces the plain keyword. */
const unique = (list: Completion[]): Completion[] => {
  const seen = new Set<string>();
  return list.filter((c) => !seen.has(c.label) && !!seen.add(c.label));
};

const LISTS: Record<Language, Completion[]> = {
  cpp: unique(CPP),
  rust: unique(RUST),
  python: unique(PYTHON),
  javascript: unique(JAVASCRIPT),
  typescript: unique(JAVASCRIPT),
};

export function completionsFor(language: Language): CompletionSource {
  return ifNotIn(QUIET_NODES, completeFromList(LISTS[language]));
}

/** The raw list, for tests. */
export function completionList(language: Language): readonly Completion[] {
  return LISTS[language];
}

/** An editor extension that adds these suggestions for one language. */
export function extraCompletions(language: Language): Extension {
  return EditorState.languageData.of(() => [{ autocomplete: completionsFor(language) }]);
}

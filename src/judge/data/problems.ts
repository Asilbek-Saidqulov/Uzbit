import { CODING_EXERCISES } from '../../data/curriculumData.ts';
import type { CodeExercise } from '../../types/index.ts';
import type { Difficulty, JudgeProblem, Language, TestCase } from '../types';

const LEVEL_TO_DIFFICULTY: Record<CodeExercise['level'], Difficulty> = {
  beginner: 'easy',
  intermediate: 'medium',
  advanced: 'hard',
  mastery: 'hard',
};

/** Exercises rewritten as standard-input problems below, so they are not adapted. */
const REWRITTEN_IDS = new Set(['cpp-beg-gcd', 'rust-int-bitwise']);

const stdio = (
  p: Omit<JudgeProblem, 'mode' | 'entryFunction' | 'languages' | 'starters'> & { starters?: JudgeProblem['starters'] }
): JudgeProblem => ({
  ...p,
  mode: 'stdio',
  languages: ['python', 'javascript', 'typescript', 'cpp', 'rust'],
  starters: p.starters ?? {},
});

/** Stdio problems: the program reads stdin and prints the answer. */
const STDIO_PROBLEMS: JudgeProblem[] = [
  stdio({
    id: 'ab-sum', code: 'R078I', title: 'A+B', difficulty: 'easy', tags: ['math', 'input/output'],
    timeLimitMs: 1000, memoryMb: 16,
    statement: 'Two integers A and B are given. Print their sum.',
    inputSpec: 'A single line with two integers A and B (1 ≤ A, B < 10^9).',
    outputSpec: 'Print one integer: A + B.',
    hint: 'Read both numbers from the same line. Split the line on spaces, convert each part to an integer, and add them.',
    tests: [
      { input: '2 3', output: '5', example: true },
      { input: '1 1', output: '2' },
      { input: '999999999 1', output: '1000000000' },
      { input: '123456 654321', output: '777777' },
      { input: '500000000 500000000', output: '1000000000' },
    ],
  }),
  stdio({
    id: 'sum-n', code: 'SUM01', title: 'Sum of N Numbers', difficulty: 'easy', tags: ['arrays', 'input/output'],
    timeLimitMs: 1000, memoryMb: 16,
    statement: 'Given a list of N integers, print their sum.',
    inputSpec: 'The first line contains N (1 ≤ N ≤ 10^5). The second line contains N integers a_i (|a_i| ≤ 10^9).',
    outputSpec: 'Print one integer: the sum of all a_i.',
    hint: 'Read N, then read the list. Keep a running total in a variable that starts at 0.',
    tests: [
      { input: '3\n1 2 3', output: '6', example: true },
      { input: '5\n10 20 30 40 50', output: '150', example: true },
      { input: '1\n-5', output: '-5' },
      { input: '4\n-1 -2 -3 -4', output: '-10' },
      { input: '2\n1000000000 1000000000', output: '2000000000' },
    ],
  }),
  stdio({
    id: 'reverse-str', code: 'STR01', title: 'Reverse a String', difficulty: 'easy', tags: ['strings'],
    timeLimitMs: 1000, memoryMb: 16,
    statement: 'Given a string s, print the characters of s in reverse order.',
    inputSpec: 'One line containing the string s (1 ≤ |s| ≤ 10^5). The string may contain spaces.',
    outputSpec: 'Print the reversed string on one line.',
    hint: 'Read the whole line, not just the first word. Most languages can reverse a string with a slice, a builder, or a loop from the end.',
    tests: [
      { input: 'hello', output: 'olleh', example: true },
      { input: 'a b c', output: 'c b a', example: true },
      { input: 'racecar', output: 'racecar' },
      { input: 'x', output: 'x' },
      { input: '2024 is here', output: 'ereh si 4202' },
    ],
  }),
  stdio({
    id: 'max-subarray', code: 'DP01', title: 'Maximum Subarray Sum', difficulty: 'medium',
    tags: ['dynamic programming', 'arrays'], timeLimitMs: 1000, memoryMb: 32,
    statement:
      'Given an array of N integers, find the largest possible sum of a contiguous, non-empty subarray.\n\nThis is solved in one pass with Kadane’s algorithm: keep the best sum that ends at the current position, and the best sum seen so far.',
    inputSpec: 'The first line contains N (1 ≤ N ≤ 10^5). The second line contains N integers (|a_i| ≤ 10^4).',
    outputSpec: 'Print the maximum subarray sum.',
    hint: 'At each element, decide whether to extend the previous subarray or start a new one at this element. Keep the best total you have seen.',
    tests: [
      { input: '9\n-2 1 -3 4 -1 2 1 -5 4', output: '6', example: true },
      { input: '3\n-1 -2 -3', output: '-1', example: true },
      { input: '1\n7', output: '7' },
      { input: '5\n5 4 -1 7 8', output: '23' },
      { input: '4\n-3 -1 -4 -2', output: '-1' },
    ],
  }),
  stdio({
    id: 'binary-search', code: 'BS01', title: 'Binary Search', difficulty: 'medium', tags: ['binary search'],
    timeLimitMs: 1000, memoryMb: 32,
    statement:
      'Given a sorted array of distinct integers and a value x, print the 0-based index of x in the array, or -1 if x is not present.\n\nDo not scan the whole array. Halve the search range on each step.',
    inputSpec:
      'The first line contains N (1 ≤ N ≤ 10^5). The second line contains N integers in strictly increasing order. The third line contains the integer x.',
    outputSpec: 'Print the index of x, or -1.',
    hint: 'Keep a low and a high index. Look at the middle element. If it is too small, move low up. If it is too large, move high down.',
    tests: [
      { input: '5\n1 3 5 7 9\n7', output: '3', example: true },
      { input: '5\n1 3 5 7 9\n4', output: '-1', example: true },
      { input: '1\n2\n2', output: '0' },
      { input: '6\n-10 -3 0 4 8 15\n15', output: '5' },
      { input: '6\n-10 -3 0 4 8 15\n-10', output: '0' },
      { input: '3\n1 2 3\n0', output: '-1' },
    ],
  }),
  stdio({
    id: 'gcd', code: 'NT01', title: 'Greatest Common Divisor', difficulty: 'easy', tags: ['number theory'],
    timeLimitMs: 1000, memoryMb: 16,
    statement:
      'Given two positive integers a and b, print their greatest common divisor.\n\nEuclid’s method works well: gcd(a, b) = gcd(b, a mod b), until the remainder is 0.',
    inputSpec: 'Two integers a and b separated by a space (1 ≤ a, b ≤ 10^9).',
    outputSpec: 'Print gcd(a, b).',
    hint: 'Replace the pair (a, b) with (b, a % b) in a loop. When b becomes 0, a is the answer.',
    tests: [
      { input: '12 18', output: '6', example: true },
      { input: '17 5', output: '1', example: true },
      { input: '100 10', output: '10' },
      { input: '1000000000 999999999', output: '1' },
      { input: '48 180', output: '12' },
    ],
  }),
  stdio({
    id: 'popcount', code: 'BIT01', title: 'Count Set Bits', difficulty: 'easy', tags: ['bit manipulation'],
    timeLimitMs: 1000, memoryMb: 16,
    statement:
      'Given a non-negative integer n, print how many 1-bits its binary representation has.\n\nThis count is also called the Hamming weight or popcount.',
    inputSpec: 'One integer n (0 ≤ n ≤ 2^31 − 1).',
    outputSpec: 'Print the number of 1-bits in n.',
    hint: 'Use n & 1 to read the lowest bit, then shift n right by one. Repeat until n is 0.',
    tests: [
      { input: '7', output: '3', example: true },
      { input: '0', output: '0', example: true },
      { input: '1023', output: '10' },
      { input: '2147483647', output: '31' },
      { input: '1024', output: '1' },
      { input: '1000', output: '6' },
    ],
  }),
];

/** Exercises from the original Code Studio, adapted to the function harness. */
function adaptExercise(ex: CodeExercise): JudgeProblem {
  const tests: TestCase[] = ex.testCases.map((tc, i) => ({
    input: JSON.stringify(tc.input),
    output: JSON.stringify(tc.expected),
    example: i < 2,
    name: tc.name,
  }));
  const languages: Language[] = ex.language === 'python' ? ['python'] : ['javascript', 'typescript'];
  return {
    id: ex.id,
    code: ex.id.split('-').map((p) => p[0]).join('').toUpperCase() + String(ex.testCases.length).padStart(2, '0'),
    title: ex.title,
    difficulty: LEVEL_TO_DIFFICULTY[ex.level],
    tags: [ex.themeCategory],
    timeLimitMs: 1000,
    memoryMb: 32,
    statement: ex.description,
    inputSpec: 'The input is a JSON array with the arguments of the function, for example [7] for fibonacci(7).',
    outputSpec: `Return the value from ${ex.entryFunction}(). The result is compared as JSON.`,
    hint: ex.hint,
    mode: 'function',
    entryFunction: ex.entryFunction,
    languages,
    starters: languages.reduce<JudgeProblem['starters']>((acc, lang) => {
      acc[lang] = ex.starterCode;
      return acc;
    }, {}),
    tests,
  };
}

const ADAPTED_PROBLEMS = CODING_EXERCISES
  .filter((ex) => !REWRITTEN_IDS.has(ex.id))
  .map(adaptExercise);

export const PROBLEMS: JudgeProblem[] = [...STDIO_PROBLEMS, ...ADAPTED_PROBLEMS];

export function getProblem(id: string): JudgeProblem | undefined {
  return PROBLEMS.find((p) => p.id === id);
}

/** Free practice: no tests, no grading. Used by "Try it" in the Learn tab. */
export const SANDBOX: JudgeProblem = {
  id: 'sandbox',
  code: 'SANDBOX',
  title: 'Sandbox',
  difficulty: 'easy',
  tags: ['free practice'],
  timeLimitMs: 2000,
  memoryMb: 64,
  statement: 'Write any program and run it with your own input. Nothing is graded or submitted here.',
  inputSpec: 'Type any input in the Custom tab under Test cases.',
  outputSpec: 'The program’s output appears in the Result tab.',
  hint: 'Open the Lessons tab and press “Try it” on a lesson or algorithm to load its code here.',
  mode: 'stdio',
  languages: ['python', 'javascript', 'typescript', 'cpp', 'rust'],
  starters: {},
  tests: [],
};

import type { Language } from '../types';

export interface Lesson {
  id: string;
  title: string;
  summary: string;
  sections: { heading: string; paragraphs: string[] }[];
  /** Runnable example per language. "Try it" opens the first one that matches the chosen language. */
  example: Partial<Record<Language, string>>;
  practice?: string;
}

export const LESSONS: Lesson[] = [
  {
    id: 'how-judge-works',
    title: 'How an online judge works',
    summary: 'Read the statement, match the input format exactly, and test before you submit.',
    sections: [
      {
        heading: 'Read the statement carefully',
        paragraphs: [
          'Every problem has four parts: the story, the input format, the output format, and the constraints. The constraints tell you how fast your solution must be. For example, a limit of 10^5 numbers means an O(n²) loop may be too slow, while O(n log n) is fine.',
          'The judge compares your output with the expected output. Trailing spaces are ignored, and numbers are compared by value. A missing value, a wrong value, or extra text still makes the answer wrong.',
        ],
      },
      {
        heading: 'Test with the examples first',
        paragraphs: [
          'Use Run to check your code against the example tests. Run does not count as a submission. When the examples pass, press Submit to check every test, including ones you cannot see.',
          'Use the Custom input box to try your own edge cases, such as zero, negative numbers, very large values, or an empty line.',
        ],
      },
    ],
    example: {
      python: "a, b = map(int, input().split())\nprint(a + b)\n",
      javascript: "const [a, b] = input().split(' ').map(Number);\nprint(a + b);\n",
    },
    practice: 'ab-sum',
  },
  {
    id: 'input-output',
    title: 'Input and output',
    summary: 'Read values from standard input and print the answer.',
    sections: [
      {
        heading: 'Reading one line',
        paragraphs: [
          'input() returns one line as text. To use numbers, convert the parts with int() in Python or Number() in JavaScript. A line like "2 3" must be split first, which turns it into two pieces of text.',
        ],
      },
      {
        heading: 'Reading many lines',
        paragraphs: [
          'Problems often give a count first, then the values. Read the count, then read that many values. In JavaScript, readAll() returns the whole input at once, which is handy when the layout is unusual.',
        ],
      },
      {
        heading: 'Printing the answer',
        paragraphs: [
          'Print exactly what the statement asks for, and nothing else. A debugging print left in the code is a common reason for a wrong answer.',
        ],
      },
    ],
    example: {
      python: "n = int(input())\nnumbers = list(map(int, input().split()))\nprint(sum(numbers))\n",
      javascript: "const n = Number(input());\nconst numbers = input().split(' ').map(Number);\nprint(numbers.reduce((s, x) => s + x, 0));\n",
    },
    practice: 'sum-n',
  },
  {
    id: 'conditions-loops',
    title: 'Conditions and loops',
    summary: 'Make decisions with if, and repeat work with for and while.',
    sections: [
      {
        heading: 'Conditions',
        paragraphs: [
          'An if statement runs its block only when the condition is true. Use % (remainder) to test divisibility: n % 2 == 0 means n is even.',
        ],
      },
      {
        heading: 'Loops',
        paragraphs: [
          'A for loop repeats a fixed number of times. Start the counter at the first value you need and stop before the first value you do not. In Python, range(1, n + 1) includes n. A while loop repeats until its condition becomes false, which is useful when you do not know the number of steps ahead.',
        ],
      },
    ],
    example: {
      python: "n = int(input())\ncount = 0\nfor i in range(1, n + 1):\n    if i % 2 == 0:\n        count += 1\nprint(count)\n",
      javascript: "const n = Number(input());\nlet count = 0;\nfor (let i = 1; i <= n; i++) {\n  if (i % 2 === 0) count++;\n}\nprint(count);\n",
    },
    practice: 'sum-n',
  },
  {
    id: 'lists-arrays',
    title: 'Lists and arrays',
    summary: 'Store many values and work with all of them.',
    sections: [
      {
        heading: 'Indexing and length',
        paragraphs: [
          'Positions start at 0. The first element is at index 0 and the last is at index length − 1. Writing past the end causes an error in Python and undefined values in JavaScript.',
        ],
      },
      {
        heading: 'Aggregating',
        paragraphs: [
          'Most problems on arrays reduce the list to one value: a sum, a maximum, or a count. Start the accumulator with a sensible value, such as 0 for a sum, or the first element for a maximum. Starting a maximum at 0 is a mistake when every value is negative.',
        ],
      },
    ],
    example: {
      python: "n = int(input())\nnums = list(map(int, input().split()))\nprint(max(nums), min(nums))\n",
      javascript: "const n = Number(input());\nconst nums = input().split(' ').map(Number);\nprint(Math.max(...nums), Math.min(...nums));\n",
    },
    practice: 'sum-n',
  },
  {
    id: 'functions',
    title: 'Functions',
    summary: 'Name a piece of logic and reuse it.',
    sections: [
      {
        heading: 'Defining and calling',
        paragraphs: [
          'A function takes inputs, does work, and returns a value. Writing the logic once in a function keeps the main part of the program short and makes it easier to test.',
        ],
      },
      {
        heading: 'Function problems',
        paragraphs: [
          'Some problems in Coding Practice ask for a function, such as fibonacci(n), instead of input and output. The judge calls your function with the arguments and compares the returned value.',
        ],
      },
    ],
    example: {
      python: "def square(x):\n    return x * x\n\nn = int(input())\nprint(square(n))\n",
      javascript: "function square(x) {\n  return x * x;\n}\n\nprint(square(Number(input())));\n",
    },
    practice: 'py-beg-fib',
  },
  {
    id: 'strings',
    title: 'Strings',
    summary: 'Work with text: its length, its characters, and its pieces.',
    sections: [
      {
        heading: 'Characters and slices',
        paragraphs: [
          'A string is a sequence of characters, so you can read one by index, take a slice, or loop over it. In Python, s[::-1] is the reversed string. In JavaScript, split(\'\') turns the string into an array of characters.',
        ],
      },
      {
        heading: 'Reading the whole line',
        paragraphs: [
          'Use input() for the whole line, including spaces. Splitting on spaces would drop everything after the first word.',
        ],
      },
    ],
    example: {
      python: "s = input()\nprint(len(s), s.upper())\n",
      javascript: "const s = input();\nprint(s.length, s.toUpperCase());\n",
    },
    practice: 'reverse-str',
  },
];

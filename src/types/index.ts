export type MathThemeId =
  | 'algebra'
  | 'geometry'
  | 'calculus'
  | 'trigonometry'
  | 'discrete'
  | 'probability';

export interface MathTheme {
  id: MathThemeId;
  title: string;
  subtitle: string;
  description: string;
  iconName: string;
  accentColor: string;
  topics: {
    name: string;
    description: string;
    formula: string;
    interactiveDemoKey: string;
  }[];
  challenge: {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  };
}

export type CodeLanguage = 'python' | 'javascript' | 'typescript' | 'cpp' | 'rust';
export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'mastery';

export interface CodeExercise {
  id: string;
  title: string;
  language: CodeLanguage;
  level: SkillLevel;
  themeCategory: string;
  description: string;
  starterCode: string;
  entryFunction: string;
  hint: string;
  testCases: {
    name: string;
    input: any[];
    expected: any;
  }[];
}

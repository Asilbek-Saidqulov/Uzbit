import { MATH_THEMES } from './curriculumData.ts';
import type { MathThemeId } from '../types/index.ts';

/**
 * Math lessons. Each lesson is one idea: a plain-language hook, something to play with,
 * and one question to check understanding. The formula and the longer technical
 * description come from the original curriculum data and sit under "Go deeper".
 */

export type DemoKey = 'unit-circle' | 'bayes' | 'truth-table';

export interface LessonCheck {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface LessonTryIt {
  label: string;
  /** Where the button goes. For "graph", the expressions are filled in automatically. */
  to: 'graph' | 'geometry' | '3d';
  expressions?: string[];
  /** One sentence telling the learner what to look for once it opens. */
  look: string;
}

export interface MathLesson {
  /** Stable id used for saved progress: "<track>/<slug>". */
  id: string;
  trackId: MathThemeId;
  slug: string;
  title: string;
  minutes: number;
  hook: string;
  tex?: string;
  demo?: DemoKey;
  tryIt?: LessonTryIt;
  deeper: string;
  check: LessonCheck;
  practice?: { problemId: string; label: string };
}

export interface MathTrack {
  id: MathThemeId;
  title: string;
  blurb: string;
  lessons: MathLesson[];
}

interface Seed {
  slug: string;
  /** Index into the theme's topics: source of the formula and the technical description. */
  topic: number;
  title: string;
  minutes?: number;
  hook: string;
  demo?: DemoKey;
  tryIt?: LessonTryIt;
  check: LessonCheck;
  practice?: MathLesson['practice'];
}

interface TrackSeed {
  id: MathThemeId;
  title: string;
  blurb: string;
  lessons: Seed[];
}

/** Suggested order: each track leans on the ones before it. */
const SEEDS: TrackSeed[] = [
  {
    id: 'algebra',
    title: 'Algebra',
    blurb: 'Equations, systems, and things that grow.',
    lessons: [
      {
        slug: 'quadratics',
        topic: 0,
        title: 'Quadratics and the discriminant',
        hook: 'A quadratic draws a U-shaped curve called a parabola. One number, b² − 4ac, tells you whether the curve crosses the x-axis twice, just touches it once, or misses it completely.',
        tryIt: {
          label: 'Open this parabola in the grapher',
          to: 'graph',
          expressions: ['f(x) = x^2 - 4'],
          look: 'Move the sliders for a, b and c and watch the number of times the curve crosses the x-axis.',
        },
        check: {
          question: 'What does the graph of y = x² + 2x + 5 do?',
          options: [
            'Crosses the x-axis twice',
            'Touches the x-axis exactly once',
            'Never reaches the x-axis',
            'Crosses the x-axis once and turns back',
          ],
          correctIndex: 2,
          explanation: 'Here a = 1, b = 2, c = 5, so b² − 4ac = 4 − 20 = −16. A negative discriminant means there is no real solution, so the curve stays above the axis.',
        },
      },
      {
        slug: 'linear-systems',
        topic: 1,
        title: 'Solving two equations at once',
        hook: 'Two straight lines either meet at one point, never meet, or are the same line. For ax + by = e and cx + dy = f, the number ad − bc tells you which: if it is not zero, there is exactly one solution.',
        tryIt: {
          label: 'Plot two lines that never meet',
          to: 'graph',
          expressions: ['y = (5 - 2*x)/3', 'y = (7 - 4*x)/6'],
          look: 'The lines have the same slope, so they are parallel. There is no point that sits on both.',
        },
        practice: { problemId: 'js-int-matrix', label: 'Practice: invert a matrix' },
        check: {
          question: 'The system 2x + 3y = 5 and 4x + 6y = 7 has…',
          options: ['Exactly one solution', 'No solution', 'Infinitely many solutions', 'Exactly two solutions'],
          correctIndex: 1,
          explanation: 'Here ad − bc = 2·6 − 3·4 = 0, so the lines are parallel or identical. Halving the second equation gives 2x + 3y = 3.5, which cannot equal 5, so the lines never meet.',
        },
      },
      {
        slug: 'exponentials',
        topic: 2,
        title: 'Growth, decay, and logarithms',
        hook: 'An exponential multiplies by the same factor again and again: savings that compound, a medicine wearing off. A logarithm runs it backwards. It answers “how long did that take?”',
        tryIt: {
          label: 'Plot growth and its inverse',
          to: 'graph',
          expressions: ['y = e^x', 'y = ln(x)'],
          look: 'The two curves are mirror images across the diagonal line y = x. That is what “inverse” looks like.',
        },
        check: {
          question: 'A population grows as y = 50·e^(0.2t). Which expression gives the time t when y = 150?',
          options: ['t = 5·ln(3)', 't = 0.2·ln(3)', 't = 0.2·ln(150)', 't = 3 ÷ 0.2'],
          correctIndex: 0,
          explanation: 'Divide by 50 to get e^(0.2t) = 3. Take the natural log: 0.2t = ln(3). Divide by 0.2 and you get t = 5·ln(3), about 5.5.',
        },
      },
    ],
  },
  {
    id: 'geometry',
    title: 'Geometry',
    blurb: 'Shapes, lengths, areas and volumes.',
    lessons: [
      {
        slug: 'pythagoras',
        topic: 0,
        title: 'The Pythagorean theorem',
        hook: 'In a right triangle, the square on the longest side equals the sum of the squares on the other two. It is how you find a missing length, and the distance between any two points.',
        tryIt: {
          label: 'Open the geometry calculator',
          to: 'geometry',
          look: 'Choose a right triangle and change a side. Every step of the working is shown.',
        },
        practice: { problemId: 'js-beg-pythagoras', label: 'Practice: distance between points' },
        check: {
          question: 'A right triangle has legs of length 5 and 12. How long is the hypotenuse?',
          options: ['7', '13', '17', '169'],
          correctIndex: 1,
          explanation: '5² + 12² = 25 + 144 = 169, and the square root of 169 is 13. The 169 is c², not c.',
        },
      },
      {
        slug: 'polygons',
        topic: 1,
        title: 'From polygons to circles',
        hook: 'Give a regular polygon more and more sides, keeping the same radius, and it looks more and more like a circle. Its area closes in on πR².',
        tryIt: {
          label: 'Plot the area of an n-sided polygon',
          to: 'graph',
          expressions: ['y = (x/2)*sin(2*pi/x)'],
          look: 'Here x is the number of sides and y is the area for radius 1. Follow the curve to the right: it levels off near 3.14.',
        },
        check: {
          question: 'As the number of sides n grows very large, the area of a regular polygon inside a circle of radius R approaches…',
          options: ['2πR', 'πR²', 'nR²', 'R²/2'],
          correctIndex: 1,
          explanation: 'A polygon with huge n is almost indistinguishable from the circle around it, so its area approaches the circle’s area, πR². The 2πR option is the circle’s perimeter, not its area.',
        },
      },
      {
        slug: 'frustums',
        topic: 2,
        title: 'Cones, cut short',
        hook: 'A frustum is a cone with its tip sliced off, like a lampshade or a paper cup. Its volume is the big cone minus the small cone that was cut away.',
        tryIt: {
          label: 'Explore 3D shapes',
          to: '3d',
          look: 'Drag to turn each shape and switch to wireframe to see the edges.',
        },
        check: {
          question: 'A frustum has height 3, bottom radius 2 and top radius 1. What is its volume?',
          options: ['3π', '7π', '9π', '21π'],
          correctIndex: 1,
          explanation: 'V = ⅓·π·h·(R² + R·r + r²) = ⅓·π·3·(4 + 2 + 1) = 7π.',
        },
      },
    ],
  },
  {
    id: 'trigonometry',
    title: 'Trigonometry',
    blurb: 'Circles, angles and things that repeat.',
    lessons: [
      {
        slug: 'unit-circle',
        topic: 0,
        title: 'The unit circle',
        hook: 'Walk around a circle of radius 1. At any angle, your sideways position is the cosine and your height is the sine. Every trig value is just a coordinate.',
        demo: 'unit-circle',
        check: {
          question: 'At θ = 90°, what are cos θ and sin θ?',
          options: ['cos = 0, sin = 1', 'cos = 1, sin = 0', 'cos = −1, sin = 0', 'cos = 0, sin = −1'],
          correctIndex: 0,
          explanation: 'At 90° you are straight up from the centre: no sideways distance (cos = 0) and the full height of the circle (sin = 1).',
        },
      },
      {
        slug: 'waves',
        topic: 1,
        title: 'Waves: height and speed',
        hook: 'Sound, light and a swinging pendulum all repeat in waves. A wave is described by how tall it is (amplitude), how often it repeats (frequency) and where it starts (phase).',
        tryIt: {
          label: 'Plot a wave',
          to: 'graph',
          expressions: ['y = 2*sin(3*x)'],
          look: 'The 2 sets the height and the 3 sets how quickly it repeats. Edit them and watch the curve respond.',
        },
        check: {
          question: 'What happens to a wave if you double its amplitude?',
          options: ['It repeats twice as often', 'It becomes twice as tall', 'It shifts to the left', 'Nothing changes'],
          correctIndex: 1,
          explanation: 'Amplitude is the height of the wave. Doubling it stretches the wave vertically; the spacing between peaks stays the same.',
        },
      },
    ],
  },
  {
    id: 'calculus',
    title: 'Calculus',
    blurb: 'Rates of change and total accumulation.',
    lessons: [
      {
        slug: 'derivatives',
        topic: 0,
        title: 'Slope at a single point',
        hook: 'Zoom in far enough on a smooth curve and it looks like a straight line. The slope of that line is the derivative: how fast the curve is rising at that exact spot.',
        tryIt: {
          label: 'Plot y = x² in the grapher',
          to: 'graph',
          expressions: ['f(x) = x^2'],
          look: 'Under the equation, switch on “f(x) Tangent”, then change its x value. The tangent line shows the slope at that spot.',
        },
        check: {
          question: 'What is the slope of y = x² at x = 3?',
          options: ['3', '6', '9', '2'],
          correctIndex: 1,
          explanation: 'The derivative of x² is 2x. At x = 3 that is 6. The value 9 is the height of the curve there, not its slope.',
        },
      },
      {
        slug: 'integrals',
        topic: 1,
        title: 'Area under a curve',
        hook: 'A definite integral adds up the area under a curve between two points. Cut the area into thin strips, add them up, then make the strips thinner and thinner.',
        tryIt: {
          label: 'Plot y = 2x in the grapher',
          to: 'graph',
          expressions: ['f(x) = 2*x'],
          look: 'Under the equation, switch on “Area ∫”, then change the bounds a and b. The shaded region is the integral.',
        },
        practice: { problemId: 'py-mast-simpson', label: 'Practice: estimate an integral in code' },
        check: {
          question: 'What is the area under y = 2x from x = 0 to x = 3?',
          options: ['6', '9', '18', '3'],
          correctIndex: 1,
          explanation: 'An antiderivative of 2x is x². So the area is 3² − 0² = 9. You can also check it as a triangle: ½ × 3 × 6 = 9.',
        },
      },
      {
        slug: 'taylor',
        topic: 2,
        title: 'Approximating with polynomials',
        hook: 'Near a point, almost any smooth curve can be copied by a polynomial. Keep more terms and the copy stays accurate for longer.',
        tryIt: {
          label: 'Compare sin(x) with a cubic',
          to: 'graph',
          expressions: ['y = sin(x)', 'y = x - x^3/6'],
          look: 'The two curves are almost identical near 0, then drift apart as x moves away.',
        },
        check: {
          question: 'Which cubic best approximates sin(x) near x = 0?',
          options: ['x + x³/6', 'x − x³/6', '1 − x²/2', 'x − x³/3'],
          correctIndex: 1,
          explanation: 'The Taylor series of sin(x) is x − x³/6 + x⁵/120 − … Option 1 − x²/2 is the start of cos(x), not sin(x).',
        },
      },
    ],
  },
  {
    id: 'probability',
    title: 'Probability',
    blurb: 'Chance, evidence and the shape of data.',
    lessons: [
      {
        slug: 'bayes',
        topic: 0,
        title: 'Updating beliefs with Bayes’ theorem',
        hook: 'A positive test is not the same as “you have it”. How much to believe the result depends on how common the condition was to begin with. Bayes’ theorem makes that precise.',
        demo: 'bayes',
        check: {
          question: 'A condition affects 1% of people. A test catches 99% of cases but also wrongly flags 5% of healthy people. You test positive. About how likely is it that you have the condition?',
          options: ['About 99%', 'About 50%', 'About 17%', 'About 5%'],
          correctIndex: 2,
          explanation: 'Out of 10,000 people, 100 have it and 99 of them test positive. Of the 9,900 healthy people, 495 test positive by mistake. So 99 of the 594 positives are real: about 17%.',
        },
      },
      {
        slug: 'normal',
        topic: 1,
        title: 'The bell curve',
        hook: 'Heights, measurement errors and test scores pile up in a bell shape around an average. How spread out they are is the standard deviation.',
        tryIt: {
          label: 'Plot the bell curve',
          to: 'graph',
          expressions: ['y = e^(-x^2/2)'],
          look: 'The curve peaks at the average and falls away evenly on both sides.',
        },
        check: {
          question: 'About what share of values lie within 2 standard deviations of the mean?',
          options: ['50%', '68%', '95%', '99.7%'],
          correctIndex: 2,
          explanation: 'For a normal distribution: about 68% are within 1 standard deviation, about 95% within 2, and about 99.7% within 3.',
        },
      },
    ],
  },
  {
    id: 'discrete',
    title: 'Discrete math',
    blurb: 'Logic, counting and structures.',
    lessons: [
      {
        slug: 'de-morgan',
        topic: 0,
        title: 'Logic and De Morgan’s laws',
        hook: 'De Morgan’s laws say “not (A and B)” is the same as “(not A) or (not B)”. They let you rewrite conditions in programs and circuits without changing what they do.',
        demo: 'truth-table',
        check: {
          question: 'Which expression is equivalent to NOT (A OR B)?',
          options: ['(NOT A) OR (NOT B)', '(NOT A) AND (NOT B)', 'A AND B', 'NOT A OR B'],
          correctIndex: 1,
          explanation: 'NOT (A OR B) is true only when both A and B are false, which is exactly “(NOT A) AND (NOT B)”. Switching AND and OR as you push the NOT inside is the whole law.',
        },
      },
      {
        slug: 'euler',
        topic: 1,
        title: 'Euler’s formula for solids',
        hook: 'For any solid with flat faces and no holes, count the corners (V), edges (E) and faces (F). Then V − E + F is always 2.',
        tryIt: {
          label: 'Look at 3D shapes',
          to: '3d',
          look: 'Pick a shape and count its corners, edges and faces. Then check the formula.',
        },
        check: {
          question: 'A cube has 8 vertices and 6 faces. How many edges does it have?',
          options: ['10', '12', '14', '16'],
          correctIndex: 1,
          explanation: 'V − E + F = 2, so 8 − E + 6 = 2, which gives E = 12.',
        },
      },
    ],
  },
];

function buildTrack(seed: TrackSeed): MathTrack {
  const theme = MATH_THEMES.find((t) => t.id === seed.id);
  if (!theme) throw new Error(`Unknown track ${seed.id}`);

  const lessons: MathLesson[] = seed.lessons.map((s) => {
    const topic = theme.topics[s.topic];
    if (!topic) throw new Error(`Track ${seed.id} has no topic ${s.topic}`);
    return {
      id: `${seed.id}/${s.slug}`,
      trackId: seed.id,
      slug: s.slug,
      title: s.title,
      minutes: s.minutes ?? 5,
      hook: s.hook,
      tex: topic.formula,
      demo: s.demo,
      tryIt: s.tryIt,
      deeper: topic.description,
      check: s.check,
      practice: s.practice,
    };
  });

  // The last lesson in every track is its checkpoint question.
  lessons.push({
    id: `${seed.id}/checkpoint`,
    trackId: seed.id,
    slug: 'checkpoint',
    title: `${seed.title} checkpoint`,
    minutes: 3,
    hook: `One question that pulls together what you have seen in ${seed.title.toLowerCase()}.`,
    deeper: '',
    check: theme.challenge,
  });

  return { id: seed.id, title: seed.title, blurb: seed.blurb, lessons };
}

export const TRACKS: MathTrack[] = SEEDS.map(buildTrack);

/** Every lesson in learning order. */
export const ALL_LESSONS: MathLesson[] = TRACKS.flatMap((t) => t.lessons);

export const TOTAL_LESSONS = ALL_LESSONS.length;

export function getTrack(id: string): MathTrack | undefined {
  return TRACKS.find((t) => t.id === id);
}

export function getLesson(trackId: string, slug: string): MathLesson | undefined {
  return getTrack(trackId)?.lessons.find((l) => l.slug === slug);
}

export function getLessonById(id: string): MathLesson | undefined {
  return ALL_LESSONS.find((l) => l.id === id);
}

/** The lessons before and after this one in learning order. */
export function lessonNeighbors(id: string): { prev?: MathLesson; next?: MathLesson } {
  const i = ALL_LESSONS.findIndex((l) => l.id === id);
  if (i < 0) return {};
  return { prev: ALL_LESSONS[i - 1], next: ALL_LESSONS[i + 1] };
}

/** First lesson not yet completed, in learning order. Undefined when everything is done. */
export function nextIncompleteLesson(isDone: (id: string) => boolean, within?: MathTrack): MathLesson | undefined {
  return (within ? within.lessons : ALL_LESSONS).find((l) => !isDone(l.id));
}

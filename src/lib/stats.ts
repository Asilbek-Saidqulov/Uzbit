export type SummaryStatistics = {
  n: number;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  iqr: number;
  mean: number;
  sum: number;
  varianceSample: number;
  variancePop: number;
  stdevSample: number;
  stdevPop: number;
  modes: number[];
};

const round = (val: number, decimals = 4) => {
  if (!Number.isFinite(val)) return 0;
  const factor = 10 ** decimals;
  return Math.round(val * factor) / factor;
};

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 1) return sorted[0];
  const index = (sorted.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

export function computeSummaryStatistics(data: number[]): SummaryStatistics | null {
  const clean = data.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  const n = clean.length;
  if (n === 0) return null;

  const sum = clean.reduce((acc, v) => acc + v, 0);
  const mean = sum / n;

  // Variances
  const ss = clean.reduce((acc, v) => acc + (v - mean) ** 2, 0);
  const variancePop = ss / n;
  const varianceSample = n > 1 ? ss / (n - 1) : 0;
  const stdevPop = Math.sqrt(variancePop);
  const stdevSample = Math.sqrt(varianceSample);

  // Five-number summary
  const min = clean[0];
  const max = clean[n - 1];
  const median = percentile(clean, 0.5);
  const q1 = percentile(clean, 0.25);
  const q3 = percentile(clean, 0.75);
  const iqr = q3 - q1;

  // Modes
  const freq = new Map<number, number>();
  let maxFreq = 0;
  for (const v of clean) {
    const count = (freq.get(v) || 0) + 1;
    freq.set(v, count);
    if (count > maxFreq) maxFreq = count;
  }

  const modes: number[] = [];
  if (maxFreq > 1) {
    for (const [v, count] of freq.entries()) {
      if (count === maxFreq) modes.push(v);
    }
  }

  return {
    n,
    min: round(min),
    q1: round(q1),
    median: round(median),
    q3: round(q3),
    max: round(max),
    iqr: round(iqr),
    mean: round(mean),
    sum: round(sum),
    varianceSample: round(varianceSample),
    variancePop: round(variancePop),
    stdevSample: round(stdevSample),
    stdevPop: round(stdevPop),
    modes: modes.map((m) => round(m)),
  };
}
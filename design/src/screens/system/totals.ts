import {DAILY, DAYS, MANAGERS, type Manager} from '../../world';
import {LONGER, WAITING_BEFORE, type Period} from './data';

export type Unit = '%' | 'points' | '';
/** The six numbers at the top. `delta` is in percent, or in points for the share sent back. */
export interface Kpi {
  key: string;
  label: string;
  /** What it counts, in words. */
  means: string;
  value: string;
  unit: Unit;
  delta: number;
  higherIsBetter: boolean;
}

const total = (pick: (m: Manager) => number): number =>
  MANAGERS.reduce((sum, m) => sum + pick(m), 0);
const before = (now: number, changePct: number): number =>
  now / (1 + changePct / 100);
const change = (now: number, was: number): number => ((now - was) / was) * 100;
const outBefore = (m: Manager): number => before(m.last7.out, m.delta.out);

/**
 * Every manager is summed once. A parent's own numbers do not include its
 * children, so all seven are added. Rates are weighted by what went out, so a
 * busy manager counts for more than a quiet one.
 */
export const SUMS = (() => {
  const came = total(m => m.last7.came);
  const out = total(m => m.last7.out);
  const cost = total(m => m.last7.cost);
  const waiting = total(m => m.last7.waiting);
  const outBeforeTotal = total(outBefore);
  const rate = total(m => m.last7.out * m.last7.reworkPct) / out;
  const rateBefore =
    total(m => outBefore(m) * (m.last7.reworkPct - m.delta.reworkPct)) /
    outBeforeTotal;
  const hours = total(m => m.last7.out * m.last7.medianHours) / out;
  const hoursBefore =
    total(m => outBefore(m) * before(m.last7.medianHours, m.delta.medianHours)) /
    outBeforeTotal;
  return {
    came,
    out,
    cost,
    waiting,
    rate,
    hours,
    cameDelta: change(came, total(m => before(m.last7.came, m.delta.came))),
    outDelta: change(out, outBeforeTotal),
    costDelta: change(cost, total(m => before(m.last7.cost, m.delta.cost))),
    waitingDelta: change(waiting, WAITING_BEFORE),
    rateDelta: rate - rateBefore,
    hoursDelta: change(hours, hoursBefore),
  };
})();

export function kpisFor(period: Period): Kpi[] {
  const f = LONGER[period];
  const isWeek = period === '7';
  const s = SUMS;
  return [
    {key: 'line', label: 'Objectives on their line', means: 'Against the date each should be met', value: f.line.value, unit: '', delta: f.line.delta, higherIsBetter: true},
    {key: 'people', label: 'Your team’s time', means: 'Answering, reviewing, putting right', value: f.people.value, unit: '%', delta: f.people.delta, higherIsBetter: false},
    {key: 'wait', label: 'A customer’s wait', means: 'From their message to a first answer', value: f.wait.value, unit: '%', delta: f.wait.delta, higherIsBetter: false},
    {key: 'sent', label: 'Undone or sent back', means: 'By a person, of what was finished', value: isWeek ? `${Math.round(s.rate)}%` : f.sentBack.value, unit: 'points', delta: isWeek ? s.rateDelta : f.sentBack.delta, higherIsBetter: false},
    {key: 'waiting', label: 'Waiting on people', means: 'Work that stands still now', value: isWeek ? String(s.waiting) : f.waiting.value, unit: '%', delta: isWeek ? s.waitingDelta : f.waiting.delta, higherIsBetter: false},
    {key: 'cost', label: 'What it cost', means: 'Models, searches and machines', value: isWeek ? `$${s.cost}` : f.cost.value, unit: '%', delta: isWeek ? s.costDelta : f.cost.delta, higherIsBetter: false},
  ];
}

export const deltaText = (delta: number, unit: Unit): string =>
  `${delta > 0 ? '+' : ''}${unit === '' ? delta : delta.toFixed(1)}${unit === '%' ? '%' : unit === '' ? '' : ' points'}`;

// ============= TRENDS =============

export interface TrendPoint {
  t: number;
  label: string;
  current: number;
  prior: number;
}

export interface TrendSeries {
  key: string;
  title: string;
  kind: 'area' | 'line';
  color: string;
  data: TrendPoint[];
  /** The week as one number, the same as its scorecard. */
  headline: string;
  delta: number;
  unit: Unit;
  /** Short, for the axis. */
  format: (v: number) => string;
  /** Whole, for the tooltip. */
  exact: (v: number) => string;
}

/** Scale a day-by-day shape so its days add up to the total (largest remainder, so it is exact). */
function fit(shape: readonly number[], to: number): number[] {
  const sum = shape.reduce((a, b) => a + b, 0);
  const raw = shape.map(v => (v * to) / sum);
  const floored = raw.map(Math.floor);
  let left = to - floored.reduce((a, b) => a + b, 0);
  const order = raw
    .map((v, i) => ({i, r: v - Math.floor(v)}))
    .sort((a, b) => b.r - a.r);
  for (const {i} of order) {
    if (left-- > 0) {
      floored[i] = (floored[i] ?? 0) + 1;
    }
  }
  return floored;
}

const points = (current: number[], prior: number[]): TrendPoint[] =>
  current.map((v, t) => ({
    t,
    label: DAYS[t] ?? '',
    current: v,
    prior: prior[t] ?? 0,
  }));

const compact = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

/** Minutes of people’s time, each day. They add up to the 6.8 hours. */
const PEOPLE_DAYS = [70, 74, 72, 16, 14, 84, 78];
const WAIT_DAYS = [2.5, 2.7, 2.6, 2.9, 3.0, 3.4, 3.1];
const WAIT_PRIOR = [2.4, 2.4, 2.3, 2.3, 2.4, 2.4, 2.4];
const outDays = fit(DAILY.out, SUMS.out);
const costDays = fit(DAILY.cost, SUMS.cost);
// The share sent back, each day, scaled so the week comes to the week's share.
const shape =
  outDays.reduce((a, n, i) => a + n * (DAILY.rework[i] ?? 0), 0) / SUMS.out;
const rateDays = DAILY.rework.map(
  v => Math.round(((v * SUMS.rate) / shape) * 10) / 10,
);

/** The 7 days before are not in the story by day: each day is shown with the week's change taken out of it. */
const priorOf = (days: number[], pct: number): number[] =>
  days.map(v => Math.round(before(v, pct)));

export const TRENDS: TrendSeries[] = [
  {
    key: 'people',
    title: 'Your team’s time',
    kind: 'area',
    color: 'var(--color-data-categorical-blue)',
    data: points(PEOPLE_DAYS, priorOf(PEOPLE_DAYS, -12.1)),
    headline: '6.8 hours',
    delta: -12.1,
    unit: '%',
    format: v => `${v} m`,
    exact: v => `${v} minutes`,
  },
  {
    key: 'wait',
    title: 'A customer’s wait',
    kind: 'line',
    color: 'var(--color-data-categorical-green)',
    data: points(WAIT_DAYS, WAIT_PRIOR),
    headline: '3.1 hours',
    delta: 31,
    unit: '%',
    format: v => `${v} h`,
    exact: v => `${v} hours`,
  },
  {
    key: 'sent',
    title: 'Sent back by people',
    kind: 'line',
    color: 'var(--color-data-categorical-purple)',
    data: points(
      rateDays,
      rateDays.map(v => Math.round((v - SUMS.rateDelta) * 10) / 10),
    ),
    headline: `${Math.round(SUMS.rate)}%`,
    delta: SUMS.rateDelta,
    unit: 'points',
    format: v => `${v}%`,
    exact: v => `${v}%`,
  },
  {
    key: 'cost',
    title: 'What it cost',
    kind: 'line',
    color: 'var(--color-data-categorical-orange)',
    data: points(costDays, priorOf(costDays, SUMS.costDelta)),
    headline: `$${SUMS.cost}`,
    delta: SUMS.costDelta,
    unit: '%',
    format: v => `$${compact.format(v)}`,
    exact: v => `$${v}`,
  },
];

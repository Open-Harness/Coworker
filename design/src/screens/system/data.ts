/* Facts the sample story does not carry: what the 30 and 90 day views say, and how many were waiting on people a week ago. */

/** People-waiting count in the 7 days before. */
export const WAITING_BEFORE = 11;

export type Period = '7' | '30' | '90';

export const PERIOD_LABEL: Record<Period, string> = {
  '7': '7 days',
  '30': '30 days',
  '90': '90 days',
};

export const PERIOD_SUBTITLE: Record<Period, string> = {
  '7': 'Last 7 days, against the 7 before',
  '30': 'Last 30 days, against the 30 before',
  '90': 'Last 90 days, against the 90 before',
};

interface Figure {
  value: string;
  delta: number;
}

/** The longer views. The 7 day view of what managers add up to comes from `world.ts`. */
export const LONGER: Record<Period, {line: Figure; people: Figure; wait: Figure; sentBack: Figure; waiting: Figure; cost: Figure}> = {
  '7': {line: {value: '3 of 6', delta: 1}, people: {value: '6.8 hours', delta: -12.1}, wait: {value: '3.1 hours', delta: 31}, sentBack: {value: '', delta: 0}, waiting: {value: '', delta: 0}, cost: {value: '', delta: 0}},
  '30': {line: {value: '3 of 6', delta: 0}, people: {value: '31 hours', delta: -18.4}, wait: {value: '2.6 hours', delta: 8.3}, sentBack: {value: '15%', delta: 1.4}, waiting: {value: '13', delta: 8.3}, cost: {value: '$1,540', delta: 11.6}},
  '90': {line: {value: '3 of 6', delta: 2}, people: {value: '118 hours', delta: -35.2}, wait: {value: '2.4 hours', delta: -41}, sentBack: {value: '14%', delta: -0.5}, waiting: {value: '13', delta: 44.4}, cost: {value: '$4,480', delta: 17.1}},
};

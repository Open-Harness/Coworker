import {MANAGERS, type Manager, type State} from '../../world';

/** What a manager has by itself, before anything beneath it is added. */
interface Own {
  open: number;
  waiting: number;
  out: number;
  /** out times the share sent back, so shares add up weighted by what went out. */
  backSum: number;
  reworkPct: number;
  changedAt: number;
}

export interface Row extends Record<string, unknown> {
  id: string;
  parentId: string | null;
  name: string;
  state: State;
  now: string;
  own: Own;
  /** Own plus everything beneath it. */
  open: number;
  waiting: number;
  /** Went out, and what of it was sent back, own plus beneath. */
  outAll: number;
  backAll: number;
  /** Share sent back, in percent. */
  sentBack: number;
  /** The newest change, own or beneath. */
  changedAt: number;
  /** Managers in this row, itself included. */
  count: number;
  versions: number;
  children?: Row[];
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "12 Nov" to a time, in the year of the sample story. */
function parseDay(text: string): number {
  const [day, month] = text.split(' ');
  return Date.UTC(2026, MONTHS.indexOf(month ?? 'Nov'), Number(day));
}

export function formatDay(at: number): string {
  const d = new Date(at);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

function rowOf(m: Manager): Row {
  const own: Own = {
    open: m.last7.open,
    waiting: m.last7.waiting,
    out: m.last7.out,
    backSum: m.last7.out * m.last7.reworkPct,
    reworkPct: m.last7.reworkPct,
    changedAt: parseDay(m.changed),
  };
  const kids = MANAGERS.filter(x => x.above === m.id).map(rowOf);
  return {
    id: m.id,
    parentId: m.above,
    name: m.name,
    state: m.state,
    now: m.now,
    own,
    open: 0,
    waiting: 0,
    outAll: 0,
    backAll: 0,
    sentBack: 0,
    changedAt: 0,
    count: 1,
    versions: m.version,
    ...(kids.length > 0 ? {children: kids} : {}),
  };
}


/**
 * Give every parent the totals of itself and everything beneath it. Computed
 * from the managers, never stored, and run again after a filter: removing
 * managers changes what every parent above them adds up.
 */
export function withRollups(nodes: Row[]): Row[] {
  return nodes.map(node => {
    const kids = node.children ? withRollups(node.children) : [];
    const add = (pick: (r: Row) => number) => kids.reduce((a, k) => a + pick(k), 0);
    const outAll = node.own.out + add(k => k.outAll);
    const backAll = node.own.backSum + add(k => k.backAll);
    return {
      ...node,
      ...(kids.length > 0 ? {children: kids} : {}),
      open: node.own.open + add(k => k.open),
      waiting: node.own.waiting + add(k => k.waiting),
      outAll,
      backAll,
      sentBack: node.own.reworkPct,
      changedAt: node.own.changedAt,
      count: 1 + add(k => k.count),
      versions: node.versions + add(k => k.versions),
    };
  });
}

export const ALL_ROWS: Row[] = withRollups(
  MANAGERS.filter(m => m.above === null).map(rowOf),
);

export type StateFilter = State | 'all';

/** One test for the rows on screen and the count beside the search. */
export function isMatch(node: Row, needle: string, state: StateFilter): boolean {
  const text =
    needle === '' ||
    node.name.toLowerCase().includes(needle) ||
    node.now.toLowerCase().includes(needle);
  return text && (state === 'all' || node.state === state);
}

export function countMatches(nodes: Row[], needle: string, state: StateFilter): number {
  return nodes.reduce(
    (total, node) =>
      total +
      (isMatch(node, needle, state) ? 1 : 0) +
      (node.children ? countMatches(node.children, needle, state) : 0),
    0,
  );
}

/** Keep any branch with a match at or beneath it; drop everything else. */
export function pruneTree(nodes: Row[], needle: string, state: StateFilter): Row[] {
  const kept: Row[] = [];
  for (const node of nodes) {
    const children = node.children ? pruneTree(node.children, needle, state) : [];
    if (isMatch(node, needle, state) || children.length > 0) {
      const {children: _drop, ...rest} = node;
      kept.push(children.length > 0 ? {...rest, children} : rest);
    }
  }
  return kept;
}

export function collectIds(nodes: Row[], into: Set<string>): Set<string> {
  for (const node of nodes) {
    if (node.children && node.children.length > 0) {
      into.add(node.id);
      collectIds(node.children, into);
    }
  }
  return into;
}

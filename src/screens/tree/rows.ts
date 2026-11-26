import type { TreeRow, TreeView } from "~/modules/views-workspace/types.ts";

/** What a manager is doing, as the tree says it. */
export type State = TreeRow["is"];
export type StateFilter = State | "all";

/** One manager in the tree. The view rolls each parent up, so what is a manager's own is what is left after its children. */
export interface Row extends Record<string, unknown> {
  id: string;
  parentId: string | null;
  name: string;
  state: State;
  now: string;
  /** Its own, before anything beneath it is added. */
  own: { readonly open: number; readonly waiting: number };
  /** Own plus everything beneath it. */
  open: number;
  waiting: number;
  /** The share sent back, 0 to 1. */
  sentBack: number;
  changedAt: number;
  /** Managers in this row, itself included. */
  count: number;
  /** Its own version, and the versions of it and everything beneath it. */
  version: number;
  versions: number;
  children?: Row[];
}

const rowOf = (row: TreeRow, all: readonly TreeRow[]): Row => {
  const kids = all.filter((one) => one.above === row.id).map((one) => rowOf(one, all));
  const below = (pick: (kid: Row) => number): number => kids.reduce((total, kid) => total + pick(kid), 0);
  return {
    id: row.id,
    parentId: row.above,
    name: row.name,
    state: row.is,
    now: row.now,
    own: { open: row.open - below((kid) => kid.open), waiting: row.waiting - below((kid) => kid.waiting) },
    open: row.open,
    waiting: row.waiting,
    sentBack: row.sentBack,
    changedAt: row.changed,
    count: 1 + below((kid) => kid.count),
    version: row.version,
    versions: row.version + below((kid) => kid.versions),
    ...(kids.length > 0 ? { children: kids } : {}),
  };
};

/** The managers, each under the one that looks after it. */
export const treeOf = (view: TreeView): Row[] => view.rows.filter((row) => row.above === null).map((row) => rowOf(row, view.rows));

/**
 * Give every parent the totals of itself and everything beneath it, again: removing managers changes what every parent
 * above them adds up.
 */
export function withRollups(nodes: Row[]): Row[] {
  return nodes.map((node) => {
    const kids = node.children ? withRollups(node.children) : [];
    const add = (pick: (kid: Row) => number): number => kids.reduce((total, kid) => total + pick(kid), 0);
    return {
      ...node,
      ...(kids.length > 0 ? { children: kids } : {}),
      open: node.own.open + add((kid) => kid.open),
      waiting: node.own.waiting + add((kid) => kid.waiting),
      count: 1 + add((kid) => kid.count),
      versions: node.version + add((kid) => kid.versions),
    };
  });
}

/** One test for the rows on screen and the count beside the search. */
export function isMatch(node: Row, needle: string, state: StateFilter): boolean {
  const text = needle === "" || node.name.toLowerCase().includes(needle) || node.now.toLowerCase().includes(needle);
  return text && (state === "all" || node.state === state);
}

export function countMatches(nodes: readonly Row[], needle: string, state: StateFilter): number {
  return nodes.reduce(
    (total, node) => total + (isMatch(node, needle, state) ? 1 : 0) + (node.children ? countMatches(node.children, needle, state) : 0),
    0,
  );
}

/** Keep any branch with a match at or beneath it; drop everything else. */
export function pruneTree(nodes: readonly Row[], needle: string, state: StateFilter): Row[] {
  const kept: Row[] = [];
  for (const node of nodes) {
    const children = node.children ? pruneTree(node.children, needle, state) : [];
    if (isMatch(node, needle, state) || children.length > 0) {
      const { children: _dropped, ...rest } = node;
      kept.push(children.length > 0 ? { ...rest, children } : rest);
    }
  }
  return kept;
}

export function collectIds(nodes: readonly Row[], into: Set<string>): Set<string> {
  for (const node of nodes) {
    if (node.children && node.children.length > 0) {
      into.add(node.id);
      collectIds(node.children, into);
    }
  }
  return into;
}

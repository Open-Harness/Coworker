import type { Clock } from "~/modules/page/types.ts";
import type { ThreadsView } from "~/modules/views-manager/types.ts";
import { dayMonth, lasted } from "../manager-frame/words.ts";

/* Coding's threads as a tree: the conversations a manager holds are the roots, and every thread is a fork of what is above it. */

export type ThreadState = "working" | "needs-you" | "done";
export type StateFilter = ThreadState | "all";

export interface Row extends Record<string, unknown> {
  readonly id: string;
  readonly parentId: string | null;
  readonly kind: "conversation" | "thread";
  readonly name: string;
  /** The thread's own id; empty for a conversation. */
  readonly label: string;
  readonly state: ThreadState | null;
  readonly task: string;
  readonly from: string;
  /** Messages in the conversation when it was forked. */
  readonly knew: number | null;
  readonly took: string;
  readonly ownCost: number;
  /** A thread shows its own cost, a conversation what is beneath it. */
  readonly cost: number;
  /** Threads beneath, at any depth, and what they cost. */
  readonly beneath: number;
  readonly beneathCost: number;
  /** How many forks down from the conversation. */
  readonly depth: number;
  readonly children?: Row[];
}

type Thread = ThreadsView["rows"][number];
const STATE: Readonly<Record<Thread["state"], ThreadState>> = { working: "working", waits: "needs-you", ended: "done" };
/** `acme/web #417` is `#417` where it is named as a place; a name without a repo stays. */
const short = (name: string): string => name.replace(/^[\w.-]+\/[\w.-]+ /u, "");

export interface Words {
  readonly clock: Clock;
  readonly zone: string;
  /** What the manager is called, for the conversation that is its own. */
  readonly manager: string;
}

function build(thread: Thread, parent: Row, all: readonly Thread[], words: Words): Row {
  const { clock, zone } = words;
  const from = parent.label !== "" ? parent.label : parent.task === "" ? words.manager : short(parent.name);
  const row: Row = {
    id: thread.id,
    parentId: parent.id,
    kind: "thread",
    name: thread.title,
    label: thread.id,
    state: STATE[thread.state],
    task: thread.work ?? "",
    from: `${from}, ${dayMonth(thread.started, zone)} ${clock.time(thread.started)}`,
    knew: thread.knew,
    took: thread.state === "ended" ? lasted(thread.took) : `${lasted(clock.now() - thread.started)} so far`,
    ownCost: thread.cost,
    cost: 0,
    beneath: 0,
    beneathCost: 0,
    depth: parent.depth + 1,
  };
  const kids = all.filter((one) => one.under === thread.id).map((one) => build(one, row, all, words));
  return kids.length > 0 ? { ...row, children: kids } : row;
}

/** What a parent counts: the threads beneath it and what they cost. Run again after a filter. */
export function withRollups(nodes: readonly Row[]): Row[] {
  return nodes.map((node) => {
    const kids = node.children ? withRollups(node.children) : [];
    const beneath = kids.reduce((sum, one) => sum + 1 + one.beneath, 0);
    const beneathCost = kids.reduce((sum, one) => sum + one.ownCost + one.beneathCost, 0);
    return {
      ...node,
      ...(kids.length > 0 ? { children: kids } : {}),
      beneath,
      beneathCost,
      cost: node.kind === "conversation" ? beneathCost : node.ownCost,
    };
  });
}

/** The tree the view describes: a root for each conversation, the forks of it under it. */
export function treeOf(view: ThreadsView, words: Words): Row[] {
  const roots = view.conversations.map((conversation): Row => {
    const root: Row = {
      id: conversation.id,
      parentId: null,
      kind: "conversation",
      name: conversation.name,
      label: "",
      state: null,
      task: conversation.work ?? "",
      from: "",
      knew: null,
      took: "",
      ownCost: 0,
      cost: 0,
      beneath: 0,
      beneathCost: 0,
      depth: 0,
    };
    const kids = view.rows.filter((one) => one.under === conversation.id).map((one) => build(one, root, view.rows, words));
    return kids.length > 0 ? { ...root, children: kids } : root;
  });
  return withRollups(roots).filter((root) => root.kind !== "conversation" || (root.children?.length ?? 0) > 0);
}

export const money = (n: number): string => `$${n.toFixed(2)}`;
export const flatten = (nodes: readonly Row[]): Row[] => nodes.flatMap((one) => [one, ...flatten(one.children ?? [])]);

export function isMatch(node: Row, needle: string, state: StateFilter): boolean {
  if (node.kind === "conversation") return false;
  const text =
    needle === "" ||
    node.name.toLowerCase().includes(needle) ||
    node.label.toLowerCase().includes(needle) ||
    node.task.toLowerCase().includes(needle);
  return text && (state === "all" || node.state === state);
}

export function countMatches(nodes: readonly Row[], needle: string, state: StateFilter): number {
  return nodes.reduce(
    (total, one) => total + (isMatch(one, needle, state) ? 1 : 0) + (one.children ? countMatches(one.children, needle, state) : 0),
    0,
  );
}

/** Keep any branch with a match at or beneath it; drop everything else. */
export function pruneTree(nodes: readonly Row[], needle: string, state: StateFilter): Row[] {
  const kept: Row[] = [];
  for (const node of nodes) {
    const children = node.children ? pruneTree(node.children, needle, state) : [];
    if (isMatch(node, needle, state) || children.length > 0) {
      const { children: _drop, ...rest } = node;
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

export function countsOf(tree: readonly Row[]) {
  const threads = flatten(tree).filter((one) => one.kind === "thread");
  const deepest = threads.reduce<Row | undefined>((best, one) => (best === undefined || one.depth > best.depth ? one : best), undefined);
  return {
    shown: threads.length,
    running: threads.filter((one) => one.state === "working").length,
    waiting: threads.filter((one) => one.state === "needs-you").length,
    deepest,
  };
}

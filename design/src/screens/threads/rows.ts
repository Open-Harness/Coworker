/*
 * Coding's threads as a tree. The numbers of the four threads in `world.ts`
 * (thread-43, 44, 45b, 46 on ACME-412, and thread-45, 46, 47, 48 running now)
 * are the story's own; the ended ones around them are added here and fit it.
 */

export type ThreadState = 'working' | 'needs-you' | 'done';
export type StateFilter = ThreadState | 'all';

export interface Row extends Record<string, unknown> {
  id: string;
  parentId: string | null;
  kind: 'conversation' | 'thread';
  name: string;
  /** The thread's own id; empty for a conversation. */
  label: string;
  state: ThreadState | null;
  task: string;
  from: string;
  /** Messages in the conversation when it was forked. */
  knew: number | null;
  took: string;
  ownCost: number;
  /** A thread shows its own cost, a conversation what is beneath it. */
  cost: number;
  /** Threads beneath, at any depth, and what they cost. */
  beneath: number;
  beneathCost: number;
  /** How many forks down from the conversation. */
  depth: number;
  children?: Row[];
}

interface Raw {
  id: string;
  name: string;
  state?: ThreadState;
  task?: string;
  when?: string;
  knew?: number;
  took?: string;
  cost?: number;
  children?: Raw[];
}

const CONVERSATIONS: Raw[] = [
  {
    id: 'c-own', name: "Coding's own conversation",
    children: [{
      id: 'thread-41', name: 'List the Node 18 options', state: 'done', task: 'ACME-398', when: '22 Nov 14:20', knew: 31, took: '18 min', cost: 1.2,
      children: [{ id: 'thread-42', name: 'Ask about Node 18', state: 'needs-you', task: 'ACME-398', when: '22 Nov 14:41', knew: 9, took: '3 d so far', cost: 0.6 }],
    }],
  },
  {
    id: 'c-412', name: '#engineering', task: 'ACME-412',
    children: [
      {
        id: 'thread-43', name: 'Find the cause', state: 'done', task: 'ACME-412', when: '24 Nov 09:14', knew: 6, took: '11 min', cost: 0.9,
        children: [{
          id: 'thread-44', name: 'Write the fix', state: 'done', task: 'ACME-412', when: '24 Nov 09:31', knew: 14, took: '52 min', cost: 3.7,
          children: [{ id: 'thread-46', name: 'Answer the review', state: 'working', task: 'ACME-412', when: '25 Nov 09:48', knew: 31, took: '6 min so far', cost: 0.7 }],
        }],
      },
      { id: 'thread-45b', name: 'Check it, fresh', state: 'done', task: 'ACME-412', when: '24 Nov 10:40', knew: 3, took: '14 min', cost: 1.1 },
    ],
  },
  {
    id: 'c-417', name: 'acme/web #417', task: 'ACME-417',
    children: [{
      id: 'thread-40', name: 'Make the templates', state: 'done', task: 'ACME-417', when: '24 Nov 14:05', knew: 5, took: '1 h 40 min', cost: 4.2,
      children: [{ id: 'thread-45', name: 'Test in three mail clients', state: 'working', task: 'ACME-417', when: '25 Nov 02:54', knew: 17, took: '7 h so far', cost: 2.1 }],
    }],
  },
  {
    id: 'c-415', name: 'acme/web #415', task: 'ACME-415',
    children: [
      { id: 'thread-39', name: 'Update the library', state: 'done', task: 'ACME-415', when: '24 Nov 17:30', knew: 4, took: '1 h 5 min', cost: 3.1 },
      { id: 'thread-47', name: 'Check it, fresh', state: 'working', task: 'ACME-415', when: '25 Nov 09:30', knew: 3, took: '24 min so far', cost: 0.6 },
    ],
  },
  {
    id: 'c-423', name: 'acme/web #423', task: 'ACME-423',
    children: [{ id: 'thread-48', name: 'Say what done means', state: 'working', task: 'ACME-423', when: '25 Nov 09:42', knew: 2, took: '12 min so far', cost: 0.3 }],
  },
];

function build(raw: Raw, parent: Row | null): Row {
  const isThread = raw.state != null;
  const row: Row = {
    id: raw.id,
    parentId: parent?.id ?? null,
    kind: isThread ? 'thread' : 'conversation',
    name: raw.name,
    label: isThread ? raw.id : '',
    state: raw.state ?? null,
    task: raw.task ?? '',
    from: parent && raw.when ? `${parent.label || (parent.id === 'c-own' ? 'Coding' : parent.name.replace('acme/web ', ''))}, ${raw.when}` : '',
    knew: raw.knew ?? null,
    took: raw.took ?? '',
    ownCost: raw.cost ?? 0,
    cost: 0,
    beneath: 0,
    beneathCost: 0,
    depth: parent ? parent.depth + 1 : 0,
  };
  const kids = (raw.children ?? []).map(c => build(c, row));
  return kids.length > 0 ? {...row, children: kids} : row;
}

/** What a parent counts: the threads beneath it and what they cost. Run again after a filter. */
export function withRollups(nodes: Row[]): Row[] {
  return nodes.map(node => {
    const kids = node.children ? withRollups(node.children) : [];
    const beneath = kids.reduce((a, k) => a + 1 + k.beneath, 0);
    const beneathCost = kids.reduce((a, k) => a + k.ownCost + k.beneathCost, 0);
    return {
      ...node,
      ...(kids.length > 0 ? {children: kids} : {}),
      beneath,
      beneathCost,
      cost: node.kind === 'conversation' ? beneathCost : node.ownCost,
    };
  });
}

export const ALL_ROWS: Row[] = withRollups(CONVERSATIONS.map(c => build(c, null)));

export function flatten(nodes: Row[]): Row[] {
  return nodes.flatMap(n => [n, ...flatten(n.children ?? [])]);
}

const THREADS = flatten(ALL_ROWS).filter(r => r.kind === 'thread');
export const COUNTS = {
  shown: THREADS.length,
  running: THREADS.filter(r => r.state === 'working').length,
  waiting: THREADS.filter(r => r.state === 'needs-you').length,
};
export const DEEPEST = THREADS.reduce((a, r) => (r.depth > a.depth ? r : a), THREADS[0]!);

export const money = (n: number): string => `$${n.toFixed(2)}`;

export function isMatch(node: Row, needle: string, state: StateFilter): boolean {
  if (node.kind === 'conversation') {
    return false;
  }
  const text =
    needle === '' ||
    node.name.toLowerCase().includes(needle) ||
    node.label.toLowerCase().includes(needle) ||
    node.task.toLowerCase().includes(needle);
  return text && (state === 'all' || node.state === state);
}

export function countMatches(nodes: Row[], needle: string, state: StateFilter): number {
  return nodes.reduce(
    (t, n) => t + (isMatch(n, needle, state) ? 1 : 0) + (n.children ? countMatches(n.children, needle, state) : 0),
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

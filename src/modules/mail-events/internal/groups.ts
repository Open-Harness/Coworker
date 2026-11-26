import type { MailRecord, Mails } from "../types.ts";

/** The ids a mail names: itself, what it answers, and the mail a report is about. */
export function named(mail: MailRecord): readonly string[] {
  return [
    mail.id,
    ...mail.refs,
    ...(mail.inReplyTo === null ? [] : [mail.inReplyTo]),
    ...mail.reports.flatMap(({ of }) => (of === null ? [] : [of])),
  ];
}

/** From oldest to newest as written; mails written at the same moment by their ids. */
export function byTime(a: MailRecord, b: MailRecord): number {
  return a.at - b.at || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

export interface Group {
  readonly ids: ReadonlySet<string>;
  readonly mails: readonly MailRecord[];
}

function find(parent: Map<string, string>, id: string): string {
  let root = id;
  for (let next = parent.get(root); next !== undefined && next !== root; next = parent.get(root)) root = next;
  for (let at = id; at !== root;) {
    const next = parent.get(at) ?? root;
    parent.set(at, root);
    at = next;
  }
  return root;
}

/** Mail that belongs together by what it says it answers, whatever order it came in. Never by subject. */
export function groups(mails: Mails): readonly Group[] {
  const parent = new Map<string, string>();
  const all = Object.values(mails);
  for (const mail of all) {
    const [first = mail.id, ...rest] = named(mail);
    if (!parent.has(first)) parent.set(first, first);
    for (const id of rest) {
      if (!parent.has(id)) parent.set(id, id);
      parent.set(find(parent, id), find(parent, first));
    }
  }
  const byRoot = new Map<string, MailRecord[]>();
  for (const mail of all) byRoot.set(find(parent, mail.id), [...(byRoot.get(find(parent, mail.id)) ?? []), mail]);
  const idsOf = new Map<string, Set<string>>();
  for (const id of parent.keys()) idsOf.set(find(parent, id), (idsOf.get(find(parent, id)) ?? new Set<string>()).add(id));
  return [...byRoot].map(([root, grouped]) => ({ ids: idsOf.get(root) ?? new Set<string>(), mails: grouped.toSorted(byTime) }));
}

/** The oldest mail it starts with, or the id that never came when the others answer one: the id nothing is known to come before. */
export function rootOf(group: Group): string {
  const after = new Set<string>();
  const first = new Map<string, number>();
  for (const mail of group.mails) {
    const chain = [...mail.refs, ...mail.reports.flatMap(({ of }) => (of === null ? [] : [of])), mail.id];
    for (const [at, id] of chain.entries()) {
      if (at > 0) after.add(id);
      first.set(id, Math.min(first.get(id) ?? mail.at, mail.at));
    }
  }
  const candidates = [...group.ids].filter((id) => !after.has(id));
  const time = (id: string) => group.mails.find((mail) => mail.id === id)?.at ?? first.get(id) ?? Number.MAX_SAFE_INTEGER;
  const best = (candidates.length === 0 ? [...group.ids] : candidates).toSorted((a, b) => time(a) - time(b) || (a < b ? -1 : 1));
  return best[0] ?? group.mails[0]?.id ?? "";
}

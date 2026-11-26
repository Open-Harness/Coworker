import type { ReviewRecord, ReviewState, Us } from "../types.ts";
import type { LineRecord, TalkRecord } from "../records.ts";

/* Each person's latest that says yes or no, and the talks on lines that are not settled. */

const later = (a: ReviewRecord, b: ReviewRecord): number => a.at - b.at || a.id - b.id;

export function reviewsOf(all: readonly ReviewRecord[], head: string | null): readonly ReviewState[] {
  const last = new Map<string, ReviewRecord>();
  for (const one of all) {
    if (one.says === "commented") continue;
    const was = last.get(one.by.login);
    if (was === undefined || later(one, was) > 0) last.set(one.by.login, one);
  }
  return [...last.values()]
    .flatMap((one) =>
      one.says === "dismissed"
        ? []
        : [
            {
              who: one.by.login,
              says: one.says === "approved" ? ("approved" as const) : ("changes" as const),
              onHead: head !== null && one.sha === head,
            },
          ],
    )
    .toSorted((a, b) => (a.who < b.who ? -1 : 1));
}

const laterLine = (a: LineRecord, b: LineRecord): LineRecord => ((a.at - b.at || a.id - b.id) > 0 ? a : b);

export interface Talks {
  readonly open: number;
  /** A talk whose last word is not ours. */
  readonly waitsForUs: boolean;
}

export function talksOf(lines: readonly LineRecord[], talks: readonly TalkRecord[], us: Us): Talks {
  const groups = new Map<number, LineRecord>();
  for (const line of lines) {
    if (line.gone) continue;
    const root = line.answers ?? line.id;
    const was = groups.get(root);
    groups.set(root, was === undefined ? line : laterLine(was, line));
  }
  const settled = new Set(talks.filter((one) => one.settled).map((one) => one.first));
  const open = [...groups].filter(([root]) => !settled.has(root));
  return { open: open.length, waitsForUs: open.some(([, last]) => last.by.login.toLowerCase() !== us.login.toLowerCase()) };
}

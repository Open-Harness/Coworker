import type { GithubRecord, Kept } from "../types.ts";

/*
 * The newest of each record, by its key. Any order, any number of times: the same end. The newest is by GitHub's time,
 * then by rank; two that share both and differ are `tied`, and the one that stays is the same whichever came first.
 */

export function keyOf(record: GithubRecord): string {
  switch (record.is) {
    case "item":
    case "pull":
      return `${record.is}:${record.number}`;
    case "talk":
      return `talk:${record.first}`;
    case "check":
      return `${record.app === "status" ? "status" : "check"}:${record.id}`;
    case "branch":
      return `branch:${record.ref}`;
    default:
      return `${record.is}:${record.id}`;
  }
}

function sorted(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sorted);
  if (typeof value !== "object" || value === null) return value;
  return Object.fromEntries(
    Object.entries(value)
      .toSorted(([a], [b]) => (a < b ? -1 : 1))
      .map(([key, one]) => [key, sorted(one)]),
  );
}
const plain = ({ tied: _tied, ...rest }: GithubRecord & { readonly tied?: true }): GithubRecord => rest as GithubRecord;
const stable = (record: GithubRecord): string => JSON.stringify(sorted(plain(record)));

function newest(old: GithubRecord | undefined, next: GithubRecord): GithubRecord {
  if (old === undefined) return next;
  const order = old.at - next.at || old.rank - next.rank;
  if (order > 0) return old;
  if (order < 0) return next;
  // A delivery never says whether a pull request merges, an answer does: what is known stays over what is not, whichever came first.
  if (old.is === "pull" && next.is === "pull" && (old.mergeable === null) !== (next.mergeable === null))
    return plain(old.mergeable === null ? next : old);
  const [a, b] = [stable(old), stable(next)];
  if (a === b) return old;
  return { ...plain(a < b ? old : next), tied: true };
}

export function keep(kept: Kept, records: readonly GithubRecord[]): Kept {
  const out: Record<string, GithubRecord> = { ...kept };
  for (const record of records) {
    const key = keyOf(record);
    out[key] = newest(out[key], record);
  }
  return out;
}

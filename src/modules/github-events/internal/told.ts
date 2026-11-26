import type { Kept, Told, Us } from "../types.ts";
import { counted } from "./checks.ts";
import { stateOf } from "./state.ts";
import { checksOf, view, type View } from "./view.ts";

/*
 * What became true between two states of what is kept. Everything here is a difference, so hearing the same thing again,
 * or something older than what is known, tells nothing. The key is of the thing: its id, its commit, when it was.
 */

const ours = (login: string, us: Us): boolean => login.toLowerCase() === us.login.toLowerCase();
type Part = (before: View, after: View, number: number, us: Us) => readonly Told[];

const said: Part = (before, after, number, us) => {
  const had = new Set([...before.comments, ...before.lines].map((one) => `${one.is}:${one.id}`));
  const fresh = [...after.comments, ...after.lines].filter(
    (one) => !had.has(`${one.is}:${one.id}`) && !one.gone && !ours(one.by.login, us),
  );
  return fresh
    .toSorted((a, b) => a.at - b.at || a.id - b.id)
    .map((one): Told =>
      one.is === "comment"
        ? { key: `comment:${one.id}`, number, at: one.at, is: "said", where: "thread", id: one.id, who: one.by, text: one.body }
        : {
            key: `line:${one.id}`,
            number,
            at: one.at,
            is: "said",
            where: "line",
            id: one.id,
            who: one.by,
            text: one.body,
            path: one.path,
            line: one.line,
          },
    );
};

/** A review is news unless the same person has said something later: then it was past when it was heard. */
const reviewed: Part = (before, after, number, us) => {
  const had = new Map(before.reviews.map((one) => [one.id, one]));
  const head = after.pull?.head.sha ?? null;
  const out: Told[] = [];
  for (const one of after.reviews.toSorted((a, b) => a.at - b.at || a.id - b.id)) {
    if (ours(one.by.login, us)) continue;
    const was = had.get(one.id);
    if (was === undefined && one.says !== "dismissed") {
      const newer = after.reviews.some(
        (other) =>
          other.by.login === one.by.login &&
          other.says !== "dismissed" &&
          (other.at > one.at || (other.at === one.at && other.id > one.id)),
      );
      if (!newer && !(one.says === "commented" && one.body === ""))
        out.push({
          key: `review:${one.id}`,
          number,
          at: one.at,
          is: "reviewed",
          who: one.by,
          says: one.says,
          text: one.body,
          onHead: head !== null && one.sha === head,
        });
    } else if (was !== undefined && was.says !== "dismissed" && one.says === "dismissed")
      out.push({ key: `taken back:${one.id}`, number, at: one.at, is: "taken back", who: one.by.login });
  }
  return out;
};

const checked = (before: Kept, after: Kept, number: number, us: Us): readonly Told[] => {
  const [was, now] = [stateOf(before, number, us), stateOf(after, number, us)];
  if (was === undefined || now === undefined || now.head === null) return [];
  if (now.checks.is !== "passed" && now.checks.is !== "failed") return [];
  if (was.checks.is === now.checks.is && was.head === now.head) return [];
  const deciding = counted(checksOf(after, now.head)).filter((one) => (now.checks.is === "failed" ? one.ended === "failed" : true));
  const key = `checked:${now.head}:${now.checks.is}:${deciding.map((one) => one.id).join(",")}`;
  const at = Math.max(0, ...deciding.map((one) => one.at));
  return [{ key, number, at, is: "checked", ended: now.checks.is, failed: now.checks.failed, sha: now.head }];
};

const changed: Part = (before, after, number, us) => {
  const [was, now] = [before, after];
  if (was.item === undefined && was.pull === undefined) return [];
  const { item, pull } = after;
  const at = Math.max(item?.at ?? 0, pull?.at ?? 0);
  const out: Told[] = [];
  const open = (view: View): boolean => view.item?.open === true && view.item.gone !== true;
  const mine = item !== undefined && ours(item.by.login, us);
  const ended = (view: View): boolean => (view.pull?.merged ?? false) || (view.item !== undefined && !view.item.open);
  if (was.pull !== undefined && pull !== undefined && was.pull.head.sha !== pull.head.sha && !mine)
    out.push({ key: `moved:${pull.head.sha}:${pull.at}`, number, at: pull.at, is: "moved", sha: pull.head.sha });
  if (was.pull !== undefined && pull !== undefined && was.pull.mergeable !== false && pull.mergeable === false)
    out.push({ key: `conflict:${pull.head.sha}:${pull.at}`, number, at: pull.at, is: "conflict", sha: pull.head.sha });
  if (open(was) && ended(now) && item !== undefined) {
    const merged = pull?.merged === true;
    out.push({
      key: `ended:${number}:${at}`,
      number,
      at,
      is: "ended",
      as: merged ? "merged" : "closed",
      closedAs: item.closedAs,
      who: merged ? (pull?.mergedBy?.login ?? null) : null,
    });
  }
  if (ended(was) && open(now)) out.push({ key: `opened again:${number}:${at}`, number, at, is: "opened again" });
  if (was.pull?.draft === true && pull?.draft === false && open(now) && !mine)
    out.push({ key: `ready:${number}:${pull.at}`, number, at: pull.at, is: "ready" });
  return out;
};

export function told(before: Kept, after: Kept, number: number, us: Us): readonly Told[] {
  const [was, now] = [view(before, number), view(after, number)];
  if (was.item === undefined && was.pull === undefined) return [];
  return [
    ...said(was, now, number, us),
    ...reviewed(was, now, number, us),
    ...checked(before, after, number, us),
    ...changed(was, now, number, us),
  ];
}

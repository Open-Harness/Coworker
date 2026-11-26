import type { HeardEvent } from "../types.ts";
import { closes } from "./closes.ts";
import { recordsOfPull } from "./item.ts";
import { itemFrom } from "./item.ts";
import { isJson, num, obj, str, whoAt, type Json } from "./json.ts";
import { commentFrom, lineFrom, reviewFrom, talkFrom } from "./parts.ts";
import { isOurLabel, isOurs, speaksTo, type Context, type Seen } from "./seen.ts";

/* Issues, pull requests and what is said on them. Each returns `undefined` for a delivery that cannot be read. */

type Handler = (payload: Json, at: Context) => Seen | undefined;

const ISSUE: Readonly<Record<string, HeardEvent>> = {
  opened: "issue",
  reopened: "issue",
  edited: "issue",
  deleted: "issue",
  labeled: "label",
  unlabeled: "label",
  closed: "closed",
};
const PULL: Readonly<Record<string, HeardEvent>> = {
  opened: "pull_request",
  reopened: "pull_request",
  synchronize: "pull_request",
  ready_for_review: "pull_request",
  converted_to_draft: "pull_request",
  edited: "pull_request",
  review_requested: "pull_request",
  review_request_removed: "pull_request",
  labeled: "label",
  unlabeled: "label",
};

const plain = { why: "", sha: null, addressed: false, title: "", text: "" } as const;

export const issues: Handler = (payload, at) => {
  const item = itemFrom(obj(payload, "issue"), at.action === "deleted");
  if (item === undefined) return undefined;
  const label = str(obj(payload, "label"), "name");
  const body = at.action === "opened" || at.action === "edited";
  return {
    ...plain,
    records: [item],
    heard: ISSUE[at.action] ?? null,
    why: `an issue was ${at.action}`,
    numbers: [item.number],
    who: at.sender,
    addressed: (at.action === "labeled" && isOurLabel(label, at.us)) || (body && speaksTo(item.body, at.us)),
    title: item.title,
    text: item.body,
    same: `issue:${item.number}:${at.action}:${item.at}:${label ?? ""}`,
    ours: isOurs(at.sender, at.us),
  };
};

export const issueComment: Handler = (payload, at) => {
  const item = itemFrom(obj(payload, "issue"), false);
  const comment = commentFrom(obj(payload, "comment"), item?.number ?? 0, at.action === "deleted");
  if (item === undefined || comment === undefined) return undefined;
  return {
    ...plain,
    records: [item, { ...comment, number: item.number }],
    heard: at.action === "created" ? "comment" : null,
    why: `a comment was ${at.action}`,
    numbers: [item.number],
    who: comment.by,
    addressed: at.action === "created" && speaksTo(comment.body, at.us),
    title: item.title,
    text: comment.body,
    same: `comment:${comment.id}`,
    ours: isOurs(comment.by, at.us),
  };
};

export const pullRequest: Handler = (payload, at) => {
  const pull = obj(payload, "pull_request");
  const records = recordsOfPull(pull);
  const item = records.find((one) => one.is === "item");
  const head = records.find((one) => one.is === "pull");
  if (item === undefined || head === undefined || head.is !== "pull") return undefined;
  const label = str(obj(payload, "label"), "name");
  const heard = at.action === "closed" ? (head.merged ? "merged" : "closed") : (PULL[at.action] ?? null);
  const body = item.is === "item" ? item.body : "";
  const mention = at.action === "opened" || at.action === "edited";
  return {
    ...plain,
    records,
    heard,
    why: `a pull request was ${at.action}`,
    numbers: [head.number, ...closes(body, at.repo)],
    sha: head.head.sha,
    who: at.sender,
    addressed: (at.action === "labeled" && isOurLabel(label, at.us)) || (mention && speaksTo(body, at.us)),
    title: item.is === "item" ? item.title : "",
    text: body,
    same: `pull:${head.number}:${at.action}:${head.at}:${head.head.sha}:${label ?? ""}`,
    ours: isOurs(at.sender, at.us),
  };
};

export const review: Handler = (payload, at) => {
  const pull = obj(payload, "pull_request");
  const records = recordsOfPull(pull);
  const head = records.find((one) => one.is === "pull");
  const given = reviewFrom(obj(payload, "review"), num(pull, "number") ?? 0);
  if (head === undefined || head.is !== "pull" || given === undefined) return undefined;
  const item = records.find((one) => one.is === "item");
  return {
    ...plain,
    records: [...records, given],
    heard: at.action === "submitted" || at.action === "dismissed" ? "review" : null,
    why: `a review was ${at.action}`,
    numbers: [head.number],
    sha: head.head.sha,
    who: given.by,
    addressed: at.action === "submitted" && speaksTo(given.body, at.us),
    title: item?.is === "item" ? item.title : "",
    text: given.body,
    same: `review:${given.id}:${given.says}`,
    ours: isOurs(given.by, at.us),
  };
};

export const lineComment: Handler = (payload, at) => {
  const pull = obj(payload, "pull_request");
  const records = recordsOfPull(pull);
  const head = records.find((one) => one.is === "pull");
  const line = lineFrom(obj(payload, "comment"), num(pull, "number") ?? 0, at.action === "deleted");
  if (head === undefined || head.is !== "pull" || line === undefined) return undefined;
  const item = records.find((one) => one.is === "item");
  return {
    ...plain,
    records: [...records, line],
    heard: at.action === "created" ? "line_comment" : null,
    why: `a comment on a line was ${at.action}`,
    numbers: [head.number],
    sha: head.head.sha,
    who: line.by,
    addressed: at.action === "created" && speaksTo(line.body, at.us),
    title: item?.is === "item" ? item.title : "",
    text: line.body,
    same: `line:${line.id}`,
    ours: isOurs(line.by, at.us),
  };
};

export const thread: Handler = (payload, at) => {
  const pull = obj(payload, "pull_request");
  const records = recordsOfPull(pull);
  const head = records.find((one) => one.is === "pull");
  if (head === undefined || !isJson(obj(payload, "thread"))) return undefined;
  const talk = talkFrom(obj(payload, "thread"), head.number, at.action === "resolved", head.at);
  return {
    ...plain,
    records: talk === undefined ? records : [...records, talk],
    heard: null,
    why: `a talk was ${at.action}`,
    numbers: [head.number],
    who: whoAt(payload, "sender"),
    same: "",
    ours: false,
  };
};

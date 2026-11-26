import { branchFrom, checkRunFrom, statusFrom } from "./check.ts";
import { list, num, obj, str, type Json } from "./json.ts";
import { isOurs, type Context, type Seen } from "./seen.ts";

/* Checks, statuses and pushes: they name a commit, not an issue. */

type Handler = (payload: Json, at: Context) => Seen | undefined;
const plain = { addressed: false, title: "", text: "", numbers: [] } as const;

export const checkRun: Handler = (payload, at) => {
  const run = obj(payload, "check_run");
  const check = checkRunFrom(run);
  if (check === undefined) return undefined;
  return {
    ...plain,
    records: [check],
    heard: at.action === "completed" ? "check" : null,
    why: `a check was ${at.action}`,
    numbers: list(run, "pull_requests").flatMap((one) => num(one, "number") ?? []),
    sha: check.sha,
    who: at.sender,
    title: check.name,
    text: check.says,
    same: `check:${check.id}:${str(run, "status") ?? ""}:${str(run, "conclusion") ?? ""}`,
    ours: isOurs(at.sender, at.us),
  };
};

export const status: Handler = (payload, at) => {
  const check = statusFrom(payload);
  if (check === undefined) return undefined;
  return {
    ...plain,
    records: [check],
    heard: check.state === "done" ? "check" : null,
    why: "a status is not over",
    sha: check.sha,
    who: at.sender,
    title: check.name,
    text: check.says,
    same: `status:${check.id}:${str(payload, "state") ?? ""}`,
    ours: isOurs(at.sender, at.us),
  };
};

export const push: Handler = (payload, at) => {
  const branch = branchFrom(payload);
  if (branch === undefined) return undefined;
  const message = str(obj(payload, "head_commit"), "message") ?? "";
  return {
    ...plain,
    records: [branch],
    heard: branch.main && branch.sha !== null ? "push" : null,
    why: "a push is not to the default branch",
    sha: branch.sha,
    who: at.sender,
    title: message.split("\n")[0] ?? "",
    text: message,
    same: `push:${branch.ref}:${branch.sha ?? "deleted"}`,
    ours: isOurs(at.sender, at.us),
  };
};

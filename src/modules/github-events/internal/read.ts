import type { Read, Us } from "../types.ts";
import { account } from "./account.ts";
import { checkRun, push, status } from "./hear-more.ts";
import { issueComment, issues, lineComment, pullRequest, review, thread } from "./hear.ts";
import { isJson, num, obj, str, timeAt, whoAt } from "./json.ts";
import type { Context, Seen } from "./seen.ts";

const HANDLERS: Readonly<Record<string, (payload: Readonly<Record<string, unknown>>, at: Context) => Seen | undefined>> = {
  issues,
  issue_comment: issueComment,
  pull_request: pullRequest,
  pull_request_review: review,
  pull_request_review_comment: lineComment,
  pull_request_review_thread: thread,
  check_run: checkRun,
  status,
  push,
};

const broken = (why: string): Read => ({ _tag: "Broken", why });

/** One delivery: the records in it, and whether anybody is to be told. Never throws. */
export function read(event: string, payload: unknown, us: Us): Read {
  if (event === "installation" || event === "installation_repositories") return account(event, payload);
  const repo = isJson(payload) ? str(obj(payload, "repository"), "full_name") : undefined;
  const handler = HANDLERS[event];
  if (handler === undefined) return { _tag: "Noise", repo: repo ?? null, why: `${event} is not heard`, records: [] };
  if (!isJson(payload)) return broken(`a ${event} that is not an object`);
  if (repo === undefined) return broken(`a ${event} of no repository`);
  const seen = handler(payload, { repo, action: str(payload, "action") ?? "", sender: whoAt(payload, "sender"), us });
  if (seen === undefined) return broken(`a ${event} that cannot be read`);
  if (seen.heard === null || seen.ours)
    return { _tag: "Noise", repo, why: seen.ours ? "ours coming back" : seen.why, records: seen.records };
  const at = Math.max(0, ...seen.records.map((one) => one.at), timeAt(payload, "updated_at") ?? 0);
  return {
    _tag: "Heard",
    repo,
    installation: num(obj(payload, "installation"), "id") ?? null,
    event: seen.heard,
    records: seen.records,
    numbers: [...new Set(seen.numbers)],
    sha: seen.sha,
    who: seen.who,
    addressed: seen.addressed,
    title: seen.title,
    text: seen.text,
    at,
    same: seen.same,
  };
}

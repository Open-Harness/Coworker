import { checkBundle } from "~/modules/boxes/service.ts";
import { connectors } from "~/modules/connectors/service.ts";
import { apply } from "../events.ts";
import { commentOnce, defaultBranch, gh, isRecord, numberOf, textOf } from "../github.ts";
import { type Call, said, type Result, type Tool, wrong } from "../tool.ts";

/* What an agent does on GitHub. The repo, the branch, the base and the thread are filled in by us from the work: a model never gives them. */

/** The most that leaves a box: bytes, and files, alike. */
const MOST = 10_000_000;
const arg = (args: unknown, name: string): unknown => (isRecord(args) ? args[name] : undefined);
const stringArg = (args: unknown, name: string): string => textOf(arg(args, name));
const waits = (why: string): Result => ({ _tag: "Waits", why });
const repoOf = ({ work }: Call): string => work.from.place;
const issueOf = ({ work }: Call): number => Number(work.from.id);
const cannot = (why: string): Result => wrong(why);

/** The pull request of this work: the one it opened, else the one it follows that is not its issue. */
export function pullOf({ c, work }: Call): number | undefined {
  const kept = c.store.once(`pull:${work.id}`);
  if (kept !== undefined) return Number(kept);
  const found = work.follows.find((one) => one.connector === "github" && one.id !== work.from.id);
  return found === undefined ? undefined : Number(found.id);
}

async function push(call: Call): Promise<Result> {
  const { c, work, branch } = call;
  const bundle = await c.boxes.bundle(work.id, branch);
  if ("_tag" in bundle) return bundle.why.startsWith("There is no branch") ? wrong(bundle.why) : waits(bundle.why);
  const base = await defaultBranch(c.outside, repoOf(call));
  const checked = checkBundle(bundle, { branch, defaultBranch: base, workflows: false, most: MOST });
  if (checked._tag === "Refused") return wrong(`Not pushed: ${checked.why}`);
  const installation = await c.outside.installation();
  if (installation === undefined) return waits("GitHub is not connected to this workspace.");
  const token = await c.outside.github.token(installation, repoOf(call), { contents: "write" });
  if (token._tag === "Failed") return waits(`GitHub would not give a way to push: ${token.reason}`);
  const pushed = await c.outside.git.push(bundle, token.token.token, { force: "only if it is ours" });
  return pushed._tag === "Pushed" ? said(`Pushed ${branch} (${pushed.head.slice(0, 7)}).`) : wrong(`Not pushed: ${pushed.why}`);
}

async function openPull(call: Call, args: unknown): Promise<Result> {
  const { c, work, branch } = call;
  const read = connectors.checked("github.open_pull_request", args);
  if (read._tag === "Wrong") return wrong(read.says);
  const [title, said_] = [textOf(read.args["title"]), textOf(read.args["body"])];
  const closes = work.from.connector === "github" ? `\n\nCloses #${issueOf(call)}` : "";
  const body = /(?:closes|fixes|resolves) #\d+/iu.test(said_) ? said_ : `${said_}${closes}`;
  const repo = repoOf(call);
  const made = await gh(c.outside, repo, { pull_requests: "write" }, "POST", "/pulls", {
    title,
    body,
    head: branch,
    base: await defaultBranch(c.outside, repo),
  });
  if (made._tag === "Cannot") return waits(made.why);
  let number = isRecord(made.value) ? numberOf(made.value["number"]) : 0;
  if (made.status === 422) {
    const open = await gh(
      c.outside,
      repo,
      { pull_requests: "read" },
      "GET",
      `/pulls?head=${encodeURIComponent(`${repo.split("/")[0]}:${branch}`)}&state=all`,
    );
    number = open._tag === "Said" && Array.isArray(open.value) && isRecord(open.value[0]) ? numberOf(open.value[0]["number"]) : 0;
  }
  if (number === 0) return wrong(`The pull request was not opened: GitHub answered ${made.status}.`);
  c.store.keepOnce(`pull:${work.id}`, String(number));
  apply(c, work.id, {
    key: `follows:${work.id}:${number}`,
    at: c.clock.now(),
    is: "follows",
    thread: { connector: "github", account: work.from.account, place: repo, id: String(number) },
  });
  return said(`Opened pull request #${number}.`);
}

async function comment(call: Call, args: unknown): Promise<Result> {
  const read = connectors.checked("github.comment", args);
  if (read._tag === "Wrong") return wrong(read.says);
  const done = await commentOnce(call.c.outside, repoOf(call), issueOf(call), textOf(read.args["text"]), call.id);
  return done._tag === "Said" ? said("Commented.") : waits(done.why);
}

async function readGithub(call: Call, args: unknown): Promise<Result> {
  const what = stringArg(args, "what");
  const given = arg(args, "number");
  const number = typeof given === "number" ? given : (pullOf(call) ?? issueOf(call));
  const paths: Readonly<Record<string, readonly [string, string]>> = {
    issue: [`/issues/${issueOf(call)}`, "issues"],
    pull: [`/pulls/${number}`, "pull_requests"],
    files: [`/pulls/${number}/files`, "pull_requests"],
    comments: [`/issues/${number}/comments`, "issues"],
  };
  const found = paths[what];
  if (found === undefined) return wrong(`github_read reads one of ${Object.keys(paths).join(", ")}.`);
  const said_ = await gh(call.c.outside, repoOf(call), { [found[1]]: "read" }, "GET", found[0]);
  if (said_._tag === "Cannot") return waits(said_.why);
  return said_.status === 200 ? said(JSON.stringify(said_.value).slice(0, 12_000)) : wrong(`GitHub answered ${said_.status}.`);
}

async function label(call: Call, args: unknown): Promise<Result> {
  const read = connectors.checked("github.label", args);
  if (read._tag === "Wrong") return wrong(read.says);
  const add = Array.isArray(read.args["add"]) ? read.args["add"].map(textOf) : [];
  const done = await gh(call.c.outside, repoOf(call), { issues: "write" }, "POST", `/issues/${issueOf(call)}/labels`, { labels: add });
  return done._tag === "Cannot" ? waits(done.why) : said("Labelled.");
}

async function update(call: Call, args: unknown): Promise<Result> {
  const read = connectors.checked("github.update_pull_request", args);
  const number = pullOf(call);
  if (read._tag === "Wrong") return wrong(read.says);
  if (number === undefined) return cannot("This work has no pull request yet.");
  const done = await gh(call.c.outside, repoOf(call), { pull_requests: "write" }, "PATCH", `/pulls/${number}`, read.args);
  return done._tag === "Cannot" ? waits(done.why) : said("Changed.");
}

/** Merges the pull request of this work, as the merge button does: only ever done after a person said yes, or the action is on. */
async function merge(call: Call): Promise<Result> {
  const number = pullOf(call);
  if (number === undefined) return cannot("This work has no pull request yet.");
  const done = await gh(call.c.outside, repoOf(call), { pull_requests: "write", contents: "write" }, "PUT", `/pulls/${number}/merge`, {
    merge_method: "squash",
  });
  if (done._tag === "Cannot") return waits(done.why);
  return done.status === 200 ? said(`Merged pull request #${number}.`) : wrong(`It was not merged: GitHub answered ${done.status}.`);
}

async function reply(call: Call, args: unknown): Promise<Result> {
  const read = connectors.checked("github.reply_on_line", args);
  const number = pullOf(call);
  if (read._tag === "Wrong") return wrong(read.says);
  if (number === undefined) return cannot("This work has no pull request yet.");
  const done = await gh(
    call.c.outside,
    repoOf(call),
    { pull_requests: "write" },
    "POST",
    `/pulls/${number}/comments/${numberOf(read.args["comment"])}/replies`,
    { body: textOf(read.args["text"]) },
  );
  return done._tag === "Cannot" ? waits(done.why) : said("Replied.");
}

const RUN: Readonly<Record<string, (call: Call, args: unknown) => Promise<Result>>> = {
  "github.read": readGithub,
  "github.comment": comment,
  "github.reply_on_line": reply,
  "github.push": push,
  "github.open_pull_request": openPull,
  "github.update_pull_request": update,
  "github.label": label,
  "github.merge": merge,
};

/** A number said as text ("1037") is the number: a model writes what it read, and it read it in text. */
function numbered(args: unknown, wanted: readonly string[]): unknown {
  if (!isRecord(args)) return args;
  return Object.fromEntries(
    Object.entries(args).map(([name, value]) => [
      name,
      wanted.includes(name) && typeof value === "string" && /^\d+$/u.test(value) ? Number(value) : value,
    ]),
  );
}

const KINDS = { text: { type: "string" }, number: { type: "number" }, list: { type: "array", items: { type: "string" } } } as const;

/** Every action of GitHub as a tool, named as the connector names it. An action that is not built answers so, in words. */
export const GITHUB_TOOLS: readonly Tool[] =
  connectors.all
    .find((one) => one.id === "github")
    ?.actions.map((action) => ({
      name: connectors.toolName(action.id),
      description: action.does,
      parameters: {
        type: "object",
        properties: Object.fromEntries(action.args.map((one) => [one.name, { ...KINDS[one.is], description: one.says }])),
        required: action.args.filter((one) => one.needed).map((one) => one.name),
        additionalProperties: false,
      },
      run: (call, args) =>
        (RUN[action.id] ?? (async () => wrong(`${action.id} is not available yet.`)))(
          call,
          numbered(
            args,
            action.args.filter((one) => one.is === "number").map((one) => one.name),
          ),
        ),
    })) ?? [];

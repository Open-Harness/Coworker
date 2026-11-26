import { boxesDown, loseBoxes, lookAtBoxes } from "./boxes.ts";
import { commit, makeRepo, tryGit } from "./git.ts";
import { bodyOf, isRecord, json, list, next, text, type Json } from "./http.ts";
import { jobSettings, runOn, spent } from "./jobs.ts";
import { script, seen, turn, type PerToken, type Rule } from "./models.ts";
import * as people from "./people.ts";
import { happened, issueJson, pullJson } from "./payloads.ts";
import { ALLOWED, calls, codes, installations, repoOf, repos, type Issue, type Person, type Repo } from "./state.ts";

/*
 * `https://world.test`: how a flow makes things happen outside, and looks at what did. Only flows call it; the product
 * cannot know it is there.
 */

const ids = new Map<string, number>();
function personOf(login: string): Person {
  const id = ids.get(login) ?? next();
  ids.set(login, id);
  return { id, login, type: login.endsWith("[bot]") ? "Bot" : "User" };
}

async function makeThe(body: Json): Promise<Json> {
  const [name, login] = [text(body["repo"]), text(body["owner"])];
  const installation = Number(body["installation"] ?? next());
  const files = (body["files"] ?? { "README.md": "# Hello\n" }) as Record<string, string>;
  const writers = list(body["writers"]).map(text);
  const repo: Repo = {
    name,
    folder: await makeRepo(name, files),
    installation,
    people: new Map([[login, "admin"], ...writers.map((one) => [one, "write"] as const)]),
    issues: new Map(),
    checks: [],
    guarded: body["guarded"] === true,
    deliveries: [],
    missed: [],
  };
  repos.set(name.toLowerCase(), repo);
  const already = installations.get(installation);
  if (already === undefined) installations.set(installation, { account: name.split("/")[0] ?? "", permissions: { ...ALLOWED, ...(body["permissions"] as object | undefined) }, on: true });
  else happened(repo, personOf(login), "installation_repositories", "added", { repositories_added: [{ full_name: name, name: name.split("/")[1] }] });
  return { installation, ownerId: personOf(login).id };
}

async function issueOf(repo: Repo, issue: Issue): Promise<Json> {
  return {
    ...issueJson(repo, issue),
    comments: issue.comments.map(({ id, by, body }) => ({ id, by: by.login, body })),
    ...(issue.pull === undefined ? {} : { pull: { ...(await pullJson(repo, issue)), lines: issue.pull.lines.map(({ by, ...line }) => ({ ...line, by: by.login })), settled: [...issue.pull.settled] } }),
  };
}

type Does = (repo: Repo, body: Json, by: Person, issue: Issue | undefined) => Promise<unknown> | unknown;
const needed = (issue: Issue | undefined): Issue => {
  if (issue === undefined) throw new Error("no such issue");
  return issue;
};

/** What a person, or CI, does on GitHub. */
const DOES: Record<string, Does> = {
  issue: (repo, body, by) => ({ number: people.openIssue(repo, by, text(body["title"]), text(body["body"]), list(body["labels"]).map(text)).number }),
  label: (repo, body, by, issue) => people.label(repo, by, needed(issue), text(body["label"])),
  comment: (repo, body, by, issue) => ({ id: people.comment(repo, by, needed(issue), text(body["text"])) }),
  line: async (repo, body, by, issue) => ({
    id: await people.lineComment(repo, by, needed(issue), {
      path: text(body["path"]),
      line: Number(body["line"] ?? 1),
      body: text(body["text"]),
      ...(typeof body["answers"] === "number" ? { answers: body["answers"] } : {}),
    }),
  }),
  review: (repo, body, by, issue) => people.review(repo, by, needed(issue), text(body["state"]) as "APPROVED", text(body["text"])),
  check: (repo, body, _by, issue) => people.check(repo, needed(issue), text(body["name"]), text(body["conclusion"]) as "success", text(body["log"])),
  push: async (repo, body, by) => ({ sha: await people.push(repo, by, text(body["branch"]), body["files"] as Record<string, string>, text(body["message"]) || "A change") }),
  pull: async (repo, body, by) => {
    await commit(repo.folder, text(body["branch"]), body["files"] as Record<string, string>, text(body["title"]));
    return { number: (await people.openPull(repo, by, text(body["title"]), text(body["body"]), text(body["branch"]), "main")).number };
  },
  resolve: (repo, body, by, issue) => people.settle(repo, by, needed(issue), Number(body["thread"]), body["settled"] !== false),
  redeliver: (repo) => ({ redelivered: people.redeliver(repo) }),
  merge: async (repo, _body, by, issue) => ({ why: (await people.mergePull(repo, by, needed(issue))) ?? null }),
  close: (repo, _body, by, issue) => people.close(repo, by, needed(issue)),
  allow: (repo, body) => {
    const held = installations.get(repo.installation);
    if (held !== undefined) Object.assign(held.permissions, body["permissions"]);
  },
  uninstall: (repo, _body, by) => {
    const held = installations.get(repo.installation);
    if (held !== undefined) held.on = false;
    happened(repo, by, "installation", "suspend", {});
  },
  install: (repo, _body, by) => {
    const held = installations.get(repo.installation);
    if (held !== undefined) held.on = true;
    happened(repo, by, "installation", "unsuspend", {});
  },
  loseBoxes: (repo, body) => loseBoxes(repo.name, body["snapshots"] === true ? "snapshots" : "nothing"),
  /** What GitHub would post to the App now, in order; each is handed out once. */
  deliveries: (repo) => ({ deliveries: repo.deliveries.splice(0) }),
  /** What was sent to nobody while the App was suspended. */
  missed: (repo) => ({ missed: repo.missed.length }),
  look: async (repo) => ({
    issues: await Promise.all([...repo.issues.values()].map((issue) => issueOf(repo, issue))),
    branches: ((await tryGit(repo.folder, "for-each-ref", "--format=%(refname:short)", "refs/heads")) ?? "").split("\n"),
    calls: calls.filter((call) => call.repo?.toLowerCase() === repo.name.toLowerCase()),
    boxes: lookAtBoxes(repo.name),
  }),
  /** A job's hidden tests, on a branch. */
  run: (repo, body) => runOn(repo.folder, text(body["branch"]), body["files"] as Record<string, string>, text(body["command"])),
  file: async (repo, body) => ({ text: (await tryGit(repo.folder, "show", `${text(body["branch"]) || "main"}:${text(body["path"])}`)) ?? null }),
};

async function onRepo(body: Json): Promise<Response> {
  const repo = repoOf(text(body["repo"]));
  const does = DOES[text(body["does"])];
  if (repo === undefined || does === undefined) return json({ message: "The world has no such thing" }, 404);
  const answer = await does(repo, body, personOf(text(body["by"]) || "someone"), repo.issues.get(Number(body["number"])));
  return json(answer ?? {});
}

export async function control(request: Request): Promise<Response | undefined> {
  const { host, pathname } = new URL(request.url);
  if (host !== "world.test") return undefined;
  const body = await bodyOf(request);
  if (pathname === "/repo") return json(await makeThe(body));
  if (pathname === "/do") return onRepo(body);
  if (pathname === "/person") return json(personOf(text(body["login"])));
  if (pathname === "/boxes") return json((boxesDown(body["down"] === true, text(body["repo"]) || null), {}));
  if (pathname === "/sign-in") {
    const code = `code${next()}`;
    codes.set(code, { login: text(body["login"]), installations: list(body["installations"]).map(Number) });
    return json({ code });
  }
  if (pathname === "/script") {
    script(text(body["model"]), list(body["rules"]) as readonly Rule[], isRecord(body["price"]) ? (body["price"] as unknown as PerToken) : undefined);
    return json({});
  }
  if (pathname === "/jobs") return json({ ...jobSettings(), spent });
  if (pathname === "/turn") return json((turn(text(body["model"]), body["is"] === "off" ? "off" : "on"), {}));
  if (pathname === "/seen") return json({ seen: seen.filter(({ model }) => model === text(body["model"])) });
  return json({ message: "Not Found" }, 404);
}

import { evictDurableObject, listDurableObjectIds } from "cloudflare:test";
import { env, exports } from "cloudflare:workers";
import { sign } from "@octokit/webhooks-methods";
import { browser, signUp, type Browser } from "../../test/flows.ts";
import type { Reads, Writes, Did } from "~/modules/api/types.ts";
import type { Rule, Seen, PerToken } from "../world/models.ts";

/*
 * What every flow stands on: a signed-up person with a workspace, models that do what the flow wrote down, a repo with
 * the App on it, and managers made from templates. Everything goes through HTTP, as a page or GitHub would do it.
 */

const APP = "http://app.test";
const worker = (exports as unknown as { default: { fetch(request: Request): Promise<Response> } }).default;
const tag = (): string => crypto.randomUUID().slice(0, 8);

/** The outside: `evals/world/control.ts`. */
export async function world<T = Record<string, any>>(path: string, body: object = {}): Promise<T> {
  const response = await fetch(`https://world.test${path}`, { method: "POST", body: JSON.stringify(body) });
  if (!response.ok) throw new Error(`The world said ${response.status} to ${path}: ${await response.text()}`);
  return (await response.json()) as T;
}

/** Which route a path with parts is: `/m/:manager/work/:work`. */
const filled = (path: string, parts: Readonly<Record<string, string>>): string => {
  const [route = "", query = ""] = path.split("?");
  const at = route.replaceAll(/:(\w+)/gu, (_, name: string) => encodeURIComponent(parts[name] ?? ""));
  const asked = query
    .split("&")
    .filter((name) => parts[name] !== undefined)
    .map((name) => `${name}=${encodeURIComponent(parts[name] ?? "")}`);
  return asked.length === 0 ? at : `${at}?${asked.join("&")}`;
};

/** Someone signed in, in a workspace. */
export class Person {
  constructor(
    readonly browser: Browser,
    readonly workspace: string,
    readonly login: string,
  ) {}

  /** A read, as a page makes it. Anything but 200 is an error that says which. */
  async see<P extends keyof Reads>(path: P, parts: Readonly<Record<string, string>> = {}): Promise<Reads[P]> {
    const response = await this.ask(path, parts);
    if (response.status !== 200) throw new Error(`GET ${filled(path, parts)} answered ${response.status}: ${(await response.text()).slice(0, 200)}`);
    return (await response.json()) as Reads[P];
  }
  ask(path: keyof Reads, parts: Readonly<Record<string, string>> = {}): Promise<Response> {
    return this.browser.send("GET", `/api/ws/${this.workspace}${filled(path, parts)}`);
  }
  async write<P extends keyof Writes>(path: P, send: Writes[P]["send"], parts: Readonly<Record<string, string>> = {}): Promise<Writes[P]["answer"]> {
    const response = await this.browser.send("POST", `/api/ws/${this.workspace}${filled(path, parts)}`, send);
    if (response.status !== 200) throw new Error(`POST ${filled(path, parts)} answered ${response.status}: ${(await response.text()).slice(0, 200)}`);
    return (await response.json()) as Writes[P]["answer"];
  }
  act(doing: string, values: Readonly<Record<string, unknown>>, key: string = tag()): Promise<Did> {
    return this.write("/do", { doing, values, key });
  }
  /** The same, and it must be done. Answers the id of what was made. */
  async done(doing: string, values: Readonly<Record<string, unknown>>, key: string = tag()): Promise<string> {
    const did = await this.act(doing, values, key);
    if (did._tag !== "Done") throw new Error(`${doing}: ${JSON.stringify(did).slice(0, 300)}`);
    return did.id ?? "";
  }
}

/** A repo outside, and what people do there. */
export class Repo {
  constructor(
    readonly name: string,
    readonly installation: number,
  ) {}

  does<T = Record<string, any>>(what: string, more: object = {}): Promise<T> {
    return world<T>("/do", { repo: this.name, does: what, ...more });
  }
  look(): Promise<{ issues: any[]; branches: string[]; calls: any[]; boxes: any[] }> {
    return this.does("look");
  }
  async issue(number: number): Promise<any> {
    return (await this.look()).issues.find((one) => one.number === number);
  }
  /** The bot's comments on an issue or a pull request. */
  async said(number: number): Promise<readonly string[]> {
    return ((await this.issue(number))?.comments ?? []).filter((one: any) => one.by === "juno-test[bot]").map((one: any) => one.body);
  }
  async pulls(): Promise<any[]> {
    return (await this.look()).issues.filter((one) => one.pull !== undefined);
  }
  /** Everything GitHub would have posted by now, posted once. Answers how many. */
  async deliver(options: { readonly twice?: boolean; readonly backwards?: boolean } = {}): Promise<number> {
    const { deliveries } = await this.does<{ deliveries: { id: string; event: string; payload: object }[] }>("deliveries");
    const order = options.backwards === true ? deliveries.toReversed() : deliveries;
    for (const one of options.twice === true ? order.flatMap((each) => [each, each]) : order) await post(one);
    return deliveries.length;
  }
}

export async function post(delivery: { id: string; event: string; payload: object }, secret = "flows-webhook-secret"): Promise<Response> {
  const body = JSON.stringify(delivery.payload);
  const headers = {
    "content-type": "application/json",
    "x-github-event": delivery.event,
    "x-github-delivery": delivery.id,
    "x-hub-signature-256": await sign(secret, body),
  };
  return worker.fetch(new Request(`${APP}/in/github`, { method: "POST", headers, body }));
}

/** Delivers what GitHub has and asks again until `is` holds. What it was last is in the error. */
export async function until<T>(repo: Repo | null, ask: () => Promise<T>, is: (value: T) => boolean, what: string, ms = 20_000): Promise<T> {
  const end = Date.now() + ms;
  let last: unknown;
  for (;;) {
    if (repo !== null) await repo.deliver();
    try {
      const value = await ask();
      if (is(value)) return value;
      last = value;
    } catch (error) {
      last = error instanceof Error ? error.message : error;
    }
    if (Date.now() > end) throw new Error(`Never came true: ${what}. Last: ${JSON.stringify(last)?.slice(0, 600)}`);
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

/** Nothing more happens: GitHub is quiet, and `ask` answers the same for a while. */
export async function quiet<T>(repo: Repo, ask: () => Promise<T>, ms = 1500): Promise<T> {
  let [last, since] = [JSON.stringify(await ask()), Date.now()];
  for (;;) {
    const delivered = await repo.deliver();
    const now = JSON.stringify(await ask());
    if (delivered > 0 || now !== last) [last, since] = [now, Date.now()];
    if (Date.now() - since > ms) return JSON.parse(now) as T;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

/** Every object is gone from memory, as after a deploy or a crash. What it had begun and not stored never happened. */
export async function crash(): Promise<void> {
  for (const binding of Object.values(env as unknown as Record<string, unknown>)) {
    const namespace = binding as DurableObjectNamespace;
    if (typeof namespace !== "object" || namespace === null || typeof namespace.idFromName !== "function") continue;
    if (Object.prototype.toString.call(binding) !== "[object DurableObjectNamespace]") continue;
    for (const id of await listDurableObjectIds(namespace)) await evictDurableObject(namespace.get(id)).catch(() => undefined);
  }
}

/** Time passes, for everything in this workspace; what is due is run before it answers. Only in the fake world. */
export async function pass(person: Person, ms: number): Promise<void> {
  const response = await person.browser.send("POST", "/api/test/time", { workspace: person.workspace, pass: ms });
  if (response.status !== 200) throw new Error(`/api/test/time answered ${response.status}`);
}
export const HOUR = 3_600_000;
export const DAY = 24 * HOUR;

export interface Models {
  readonly doer: string;
  readonly reviewer: string;
  readonly judge: string;
  readonly juno: string;
}

export interface Flow {
  readonly ama: Person;
  readonly models: Models;
  readonly connection: string;
  script(model: string, rules: readonly Rule[]): Promise<void>;
  seen(model: string): Promise<readonly Seen[]>;
  /** A repo with the App on it. With `{ installation }`, one more on an installation that is connected. */
  repo(files?: Readonly<Record<string, string>>, more?: object): Promise<Repo>;
  /** A manager on a repo, from our template. Answers its id. */
  manager(repo: Repo, answers?: Readonly<Record<string, string>>): Promise<string>;
  /** Someone else joins the workspace, known on GitHub as `login`. */
  joins(name: string, role: "Owner" | "Builder" | "Member", login?: string): Promise<Person>;
}

async function joined(owner: Person, address: string, name: string, role: string, login: string): Promise<Person> {
  const on = (await (await owner.browser.send("PUT", `/api/workspaces/${owner.workspace}/join/links`, { on: true })).json()) as { linkPath?: string };
  const [, workspaceId = "", secret = ""] = /^\/join\/link\/([^/]+)\/([^/]+)$/u.exec(on.linkPath ?? "") ?? [];
  const person = await signUp(`${name.toLowerCase()}.${address}@example.test`, name);
  await person.send("POST", "/api/join/link", { workspaceId, secret });
  const made = new Person(person, owner.workspace, login);
  const members = await owner.see("/settings/members");
  const id = members.people.find((one) => one.name === name)?.id ?? "";
  if (role !== "Member") await owner.done("person.role", { person: id, role });
  return made;
}

/** Ama signs up, makes a workspace, connects models that answer from scripts, and chooses one as the workspace's. */
export async function flow(options: { readonly price?: PerToken } = {}): Promise<Flow> {
  const address = `flow-${tag()}`;
  const signed = await signUp(`ama.${address}@example.test`, "Ama");
  const created = (await (await signed.send("POST", "/api/workspaces", { name: address, address, region: "eu" })).json()) as any;
  const ama = new Person(signed, created.workspace.workspaceId, `ama-${address}`);
  const models: Models = { doer: `${address}-doer`, reviewer: `${address}-reviewer`, judge: `${address}-judge`, juno: `${address}-juno` };
  for (const model of Object.values(models)) await world("/script", { model, rules: [], price: options.price });
  await signed.send("POST", `/api/workspaces/${ama.workspace}/models`, {
    source: "endpoint",
    label: "Scripted",
    baseUrl: "https://models.flows.test/v1",
    key: "flows-key-that-works",
  });
  let connection = "";
  const connected = async (): Promise<void> => {
    connection = (await ama.see("/settings/keys")).models[0]?.id ?? "";
    await ama.done("models.default", { connection, model: models.doer, thinking: "low" });
  };
  await connected();
  return {
    ama,
    models,
    get connection() {
      return connection;
    },
    script: async (model, rules) => void (await world("/script", { model, rules })),
    seen: async (model) => (await world<{ seen: Seen[] }>("/seen", { model })).seen,
    repo: async (files = { "add.sh": "echo $(($1 - $2))\n", "test.sh": 'test "$(sh add.sh 1 2)" = 3\n', "README.md": "# Adds\n" }, more = {}) => {
      const name = `${address}/${tag()}`;
      const { installation } = await world("/repo", { repo: name, owner: ama.login, files, ...more });
      const made = new Repo(name, installation);
      if ("installation" in more) return (await made.deliver(), made);
      const { code } = await world("/sign-in", { login: ama.login, installations: [installation] });
      const { installUrl = "" } = (await (await signed.send("GET", `/api/workspaces/${ama.workspace}/github`)).json()) as { installUrl?: string };
      const state = new URL(installUrl, APP).searchParams.get("state");
      await signed.send("POST", `/api/workspaces/${ama.workspace}/github`, { installationId: installation, code, state });
      return made;
    },
    manager: (repo, answers = {}) =>
      ama.done("manager.make", {
        template: "repo",
        answers: {
          repo: repo.name,
          name: "Coding",
          install: "true",
          test: "sh test.sh",
          doer: `${connection} ${models.doer} low`,
          reviewer: `${connection} ${models.reviewer} low`,
          judge: `${connection} ${models.judge} low`,
          ...answers,
        },
      }),
    joins: (name, role, login = `${name.toLowerCase()}-${address}`) => joined(ama, address, name, role, login),
  };
}

export { browser };

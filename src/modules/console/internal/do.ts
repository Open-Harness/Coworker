import type { Answer, Did } from "~/modules/api/types.ts";
import { doings } from "~/modules/doings/service.ts";
import type { Doing, Who } from "~/modules/doings/types.ts";
import type { ConsoleDeps } from "../types.ts";
import { ok, problem, whoOf } from "./around.ts";
import { handlerFor } from "./handlers.ts";

/* `POST /do`: the one door for every change. What it is, whether this person may, what is missing, once per key, and a line in the audit log. */

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const present = (value: unknown): boolean => value !== undefined && value !== null && !(typeof value === "string" && value.trim() === "");

const refuse = (why: string): Did => ({ _tag: "Refused", why });

/** The values as words, for the sentence in the log: a secret is never in one, and a thing that is not text is said short. */
const wordsOf = (values: Readonly<Record<string, unknown>>): Readonly<Record<string, string>> =>
  Object.fromEntries(
    Object.entries(values).map(([name, value]) => [
      name,
      typeof value === "string" ? value : typeof value === "number" || typeof value === "boolean" ? String(value) : "",
    ]),
  );

async function decide(
  c: ConsoleDeps,
  actor: Who,
  doing: Doing | undefined,
  id: string,
  values: Readonly<Record<string, unknown>>,
): Promise<Did> {
  if (doing === undefined) return refuse(`"${id}" is not something that can be done here.`);
  const may = doings.may(doing.id, actor);
  if (may.is === "off") return refuse(`You may not ${doing.label.toLowerCase()}: ${may.why}`);
  if (may.is === "ask") return refuse(`${doing.label} waits for an Owner's yes, and asking one is not there yet.`);
  const missing = doing.fields.filter(({ needed, name }) => needed && !present(values[name]));
  if (missing.length > 0) return refuse(`${doing.label} needs ${missing.map(({ label }) => label.toLowerCase()).join(", ")}.`);
  const handler = handlerFor(doing.id);
  return handler === undefined ? refuse(`${doing.label} is not available yet.`) : handler(c, values);
}

const outcomeOf = (did: Did): "done" | "refused" | "asked" | "failed" =>
  did._tag === "Done" ? "done" : did._tag === "Asked" ? "asked" : did._tag === "Refused" || did._tag === "Problems" ? "refused" : "failed";

const whyOf = (did: Did): string | null =>
  did._tag === "Refused"
    ? did.why
    : did._tag === "Problems"
      ? (did.problems[0]?.says ?? "It has a problem")
      : did._tag === "Clash"
        ? "Someone changed the same line"
        : null;

/** `actor`: who presses it. A person by default; the co-worker when it acts by itself. */
export async function run(c: ConsoleDeps, body: unknown, actor: Who = whoOf(c.who)): Promise<Answer<Did>> {
  if (!isRecord(body) || typeof body["doing"] !== "string" || typeof body["key"] !== "string" || body["key"] === "")
    return problem(422, "Send {doing, values, key}: what to do, its fields, and a key that makes a second press the first.");
  const values = isRecord(body["values"]) ? body["values"] : {};
  const [id, key] = [body["doing"], body["key"]];
  const claimed = await c.store.claim(key, id);
  if (claimed.is === "done") return ok(claimed.did);
  if (claimed.is === "busy") return ok(refuse("That press is still being done."));
  const doing = doings.all.find((one) => one.id === id);
  const did = await decide(c, actor, doing, id, values).catch((error: unknown): Did =>
    refuse(error instanceof Error ? error.message : "It could not be done."),
  );
  await c.store.settle(key, did);
  await c.store.audit({
    at: c.clock.now(),
    by: c.who.name,
    byId: c.who.id,
    kind: actor.is,
    doing: id,
    group: doing?.group ?? "Settings",
    says: doing === undefined ? `tried ${id}` : doings.sentence(doing.id, wordsOf(values), c.who.name),
    outcome: outcomeOf(did),
    why: whyOf(did),
    permission: "on",
    role: c.who.role,
  });
  return ok(did);
}

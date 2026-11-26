import type { Problem } from "~/modules/playbook/types.ts";
import type { Blank } from "../types.ts";

/* The blanks of `template.yaml`, each checked: what it is, and what it may have as its best. */

const FILE = "template.yaml";
const problem = (says: string): Problem => ({ at: FILE, says });
const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const nonEmpty = (value: unknown): value is string => typeof value === "string" && value.trim() !== "";

type Is = Blank["is"];

function readIs(id: string, value: unknown): Is | string {
  if (!isRecord(value)) return `The blank ${id} does not say what it is.`;
  const extra = (keys: readonly string[]) => Object.keys(value).filter((k) => !keys.includes(k));
  const kind = value["a"];
  const say = (what: string) => `The blank ${id} is ${what}.`;
  const unknown = extra(
    kind === "place" ? ["a", "connector"] : kind === "number" ? ["a", "unit"] : kind === "model" ? ["a", "agent"] : ["a"],
  );
  if (unknown.length > 0 && ["place", "number", "model", "person", "text"].includes(String(kind)))
    return say(`given ${unknown[0]}, which is not for a ${String(kind)}`);
  if (kind === "person" || kind === "text") return { a: kind };
  if (kind === "place")
    return nonEmpty(value["connector"]) ? { a: "place", connector: value["connector"] } : say("a place with no connector");
  if (kind === "number") return nonEmpty(value["unit"]) ? { a: "number", unit: value["unit"] } : say("a number with no unit");
  if (kind === "model") return nonEmpty(value["agent"]) ? { a: "model", agent: value["agent"] } : say("a model with no agent");
  return `The blank ${id} is of a kind, ${String(kind)}, that there is not.`;
}

function readBest(id: string, is: Is, value: unknown): Blank["best"] | string {
  if (value === null) {
    return is.a === "place" ? null : `The blank ${id} needs an answer of its own, since only a place may have none.`;
  }
  if (!isRecord(value) || typeof value["value"] !== "string" || !nonEmpty(value["from"]) || Object.keys(value).length !== 2)
    return `The blank ${id} has a best that is not a value and where it is from.`;
  if (is.a === "model" && value["value"] !== "inherit") return `The model blank ${id} has a best other than inherit.`;
  return { value: value["value"], from: value["from"] };
}

function readBlank(entry: unknown, position: number): Blank | string {
  if (!isRecord(entry)) return `Blank ${position} is not a list of keys and what they say.`;
  const id = entry["id"];
  if (typeof id !== "string" || !/^[A-Za-z0-9_]+$/u.test(id)) return `Blank ${position} has no id of letters and digits.`;
  const keys = Object.keys(entry);
  const stray = keys.find((k) => !["id", "ask", "is", "best"].includes(k));
  if (stray !== undefined) return `The blank ${id} has a key, ${stray}, that a blank does not have.`;
  if (!nonEmpty(entry["ask"])) return `The blank ${id} does not say what to ask.`;
  if (!("best" in entry)) return `The blank ${id} has no best, and not even none.`;
  const is = readIs(id, entry["is"]);
  if (typeof is === "string") return is;
  const best = readBest(id, is, entry["best"]);
  return typeof best === "string" ? best : { id, ask: entry["ask"], is, best };
}

export function readBlanks(value: unknown): { readonly blanks: readonly Blank[]; readonly problems: readonly Problem[] } {
  if (!Array.isArray(value)) return { blanks: [], problems: [] };
  const read = value.map((entry, i) => readBlank(entry, i + 1));
  const blanks = read.filter((b): b is Blank => typeof b !== "string");
  const twice = blanks.filter((b, i) => blanks.findIndex((o) => o.id === b.id) !== i).map((b) => `The blank ${b.id} is there twice.`);
  const says = [...read.filter((b): b is string => typeof b === "string"), ...twice];
  return { blanks, problems: says.map(problem) };
}

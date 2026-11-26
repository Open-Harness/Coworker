import type { Arg, ConnectorAction, Connectors } from "../types.ts";

type Checked = ReturnType<Connectors["checked"]>;

function wrong(says: string): Checked {
  return { _tag: "Wrong", says };
}

function isKind(is: Arg["is"], value: unknown): boolean {
  if (is === "text") return typeof value === "string";
  if (is === "number") return typeof value === "number" && Number.isFinite(value);
  return Array.isArray(value) && value.every((v) => typeof v === "string");
}

function ownKeys(given: object): readonly string[] {
  return Object.keys(given);
}

/** The args a model gave for one action: none of the fixed ones, every needed one, nothing else, each of its kind. */
export function checkArgs(action: ConnectorAction, given: unknown): Checked {
  if (typeof given !== "object" || given === null || Array.isArray(given)) return wrong(`${action.id} takes its arguments as an object.`);
  const keys = ownKeys(given);
  const has = (name: string) => keys.includes(name);
  const get = (name: string): unknown => Object.getOwnPropertyDescriptor(given, name)?.value;
  const ours = keys.filter((k) => action.fixed.includes(k));
  if (ours.length > 0) return wrong(`${ours.join(", ")} is filled in by us and is never given.`);
  const names = action.args.map((a) => a.name);
  const odd = keys.filter((k) => !names.includes(k));
  if (odd.length > 0) return wrong(`${action.id} has no argument ${odd.join(", ")}.`);
  const result: Record<string, unknown> = {};
  for (const a of action.args) {
    if (!has(a.name)) {
      if (a.needed) return wrong(`${a.name} is needed and was not given.`);
      continue;
    }
    const value = get(a.name);
    if (!isKind(a.is, value)) return wrong(`${a.name} must be ${a.is === "list" ? "a list of text" : a.is}.`);
    result[a.name] = value;
  }
  return { _tag: "Args", args: result };
}

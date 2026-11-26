import type { Problem, Run, Store, Values, Written } from "../types.ts";

export const ITEM = "Co-worker staging";
/** What the note was called before the product was: it is found by this name too, and takes the new one when it is next written. */
const OLD_ITEM = "Durable Teams staging";

const problem = (reason: string): Problem => ({ _tag: "Problem", reason });

interface Field {
  readonly name?: string | null;
  readonly value?: string | null;
  readonly type?: number;
}
type Item = Readonly<Record<string, unknown>> & { readonly id?: string; readonly name?: string; readonly fields?: readonly Field[] | null };

const TEXT = 0;
const HIDDEN = 1;
/** A secure note of one's own: no folder, no organization. */
const NEW: Item = { type: 2, name: ITEM, notes: null, favorite: false, secureNote: { type: 0 }, folderId: null, organizationId: null };

const isItem = (value: unknown): value is Item => typeof value === "object" && value !== null && !Array.isArray(value);

function parsed(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

/** What Bitwarden's tool said went wrong: its first line, which never holds what it was given. */
function refused(stderr: string): Problem {
  if (/not logged in/iu.test(stderr)) return problem("Bitwarden's command-line tool is not signed in. Run: bw login");
  if (/vault is locked|session key is invalid/iu.test(stderr)) return problem("Bitwarden is locked");
  return problem(`Bitwarden refused: ${stderr.trim().split("\n")[0] ?? ""}`);
}

const valuesOf = (item: Item): Values =>
  Object.fromEntries(
    (item.fields ?? []).flatMap(({ name, value }) =>
      typeof name === "string" && /^[A-Z][A-Z0-9_]*$/u.test(name) && typeof value === "string" && value !== "" ? [[name, value]] : [],
    ),
  );

const field = (name: string, value: string): Field => ({
  name,
  value,
  type: /_URL$|_MAILBOX$|_REPO$|_SLUG$|^TEST_/u.test(name) ? TEXT : HIDDEN,
});

function withValues(item: Item, values: Values): Item {
  const kept = (item.fields ?? []).map((one) => {
    const value = values[one.name ?? ""];
    return value === undefined ? one : { ...one, value };
  });
  const has = new Set(kept.map(({ name }) => name));
  return {
    ...item,
    name: ITEM,
    fields: [...kept, ...Object.entries(values).flatMap(([name, value]) => (has.has(name) ? [] : [field(name, value)]))],
  };
}

/** `bw create` and `bw edit` read base64 of the item on their standard input. */
const encoded = (item: Item): string => btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(item))));

/**
 * One secure note in a Bitwarden vault, through its own `bw` program, which must be unlocked. Values go to it on its
 * standard input only. `bw` is slow, so the item is read once and then kept in memory for this run.
 */
export function bitwarden(run: Run): Store {
  let known: Item | undefined;
  const item = async (): Promise<Item | Problem | undefined> => {
    if (known !== undefined) return known;
    const synced = await run(["bw", "sync"]);
    if (synced.code !== 0) return refused(synced.stderr);
    const found = await run(["bw", "list", "items", "--search", "staging"]);
    if (found.code !== 0) return refused(found.stderr);
    const all = parsed(found.stdout);
    if (!Array.isArray(all)) return problem("Bitwarden's answer could not be read");
    const called = (wanted: string): readonly Item[] => all.filter(isItem).filter(({ name }) => name === wanted);
    const ours = called(ITEM).length > 0 ? called(ITEM) : called(OLD_ITEM);
    if (ours.length > 1) return problem(`Bitwarden has ${ours.length} items called ${ours[0]?.name ?? ITEM}. Remove all but one`);
    return (known = ours[0]);
  };
  const isProblem = (value: Item | Problem | undefined): value is Problem => value?.["_tag"] === "Problem";
  return {
    read: async () => {
      const found = await item();
      return found === undefined ? {} : isProblem(found) ? found : valuesOf(found);
    },
    write: async (values): Promise<Written> => {
      const found = await item();
      if (isProblem(found)) return found;
      const argv = found?.id === undefined ? ["bw", "create", "item"] : ["bw", "edit", "item", found.id];
      const saved = await run(argv, encoded(withValues(found ?? NEW, values)));
      if (saved.code !== 0) return refused(saved.stderr);
      const now = parsed(saved.stdout);
      if (!isItem(now)) return problem("Bitwarden kept the item but did not say what it holds");
      known = now;
      const kept = valuesOf(now);
      const lost = Object.keys(values).filter((name) => kept[name] !== values[name]);
      return lost.length === 0
        ? { _tag: "Written", names: Object.keys(values) }
        : problem(`Bitwarden did not keep ${lost.join(", ")} as given`);
    },
  };
}

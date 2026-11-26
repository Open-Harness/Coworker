import { playbooks } from "~/modules/playbook/service.ts";
import type { Files } from "~/modules/playbook/types.ts";
import type { Blank, SaveAs, Template } from "../types.ts";
import { casesGone, cutSecrets, filesWithCases, type Gone } from "./save-cut.ts";
import { findOwn, type Own } from "./save-find.ts";
import { sweep, type Swap } from "./save-sweep.ts";

/* A manager saved as a template: its places, people and models become blanks, its secrets and cases go. */

type Saved = { readonly template: Template; readonly gone: Gone };

const take = (base: string, taken: Set<string>): string => {
  let id = base;
  for (let n = 2; taken.has(id); n += 1) id = `${base}${n}`;
  taken.add(id);
  return id;
};

const placeBase = (account: string): readonly [string, string] =>
  account === "github"
    ? ["repo", "Which repo?"]
    : account === "email"
      ? ["mailbox", "Which mailbox?"]
      : ["place", `Which place on ${account}?`];

/** The blanks for what the manager has of its own, and which word each one stands for. */
function blanksFor(own: Own): { readonly blanks: readonly Blank[]; readonly swap: Swap } {
  const taken = new Set<string>();
  const words = new Map<string, string>();
  const models = new Map<string, string>();
  const places = own.places.map((p): Blank => {
    const [base, ask] = placeBase(p.account);
    const id = take(base, taken);
    words.set(p.place, id);
    return { id, ask, is: { a: "place", connector: p.account }, best: null };
  });
  const people = own.people.map((who, i): Blank => {
    const id = take(i === 0 ? "owner" : "person", taken);
    words.set(who, id);
    return {
      id,
      ask: i === 0 ? "Who answers for it?" : "Who else is in it?",
      is: { a: "person" },
      best: { value: "whoever makes it", from: "you" },
    };
  });
  const agents = own.modelled.map((agent): Blank => {
    const id = take(agent, taken);
    models.set(`agents/${agent}.md`, id);
    return { id, ask: `Which model does ${agent} have?`, is: { a: "model", agent }, best: { value: "inherit", from: "the workspace" } };
  });
  return { blanks: [...places, ...people, ...agents], swap: { words, models } };
}

export function saveAsTemplate(input: SaveAs): Saved {
  const { ["template.yaml"]: _own, ...given } = input.files;
  const cut = cutSecrets(given);
  const read = playbooks.read(cut.files);
  const frame = { id: input.id, version: 1, name: input.name, about: input.about, whose: "this workspace" as const };
  if (read._tag === "Problems") return { template: { ...frame, needs: [], files: cut.files, blanks: [] }, gone: cut.gone };
  const own = findOwn(read.playbook);
  const planned = blanksFor(own);
  const cases = filesWithCases(cut.files);
  const swept = sweep(cut.files, planned.swap, new Set(cases));
  const files: Files = swept.files;
  const blanks = planned.blanks.filter((b) => swept.used.has(b.id));
  const gone = [...cut.gone, ...casesGone(cases)].sort((a, b) => a.at.localeCompare(b.at));
  return { template: { ...frame, needs: own.accounts, files, blanks }, gone };
}

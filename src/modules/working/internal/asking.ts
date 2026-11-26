import type { Need, NewAsk } from "~/modules/asks/types.ts";
import type { Work } from "~/modules/work/types.ts";
import type { Answer, WorkingDeps } from "../types.ts";
import { apply } from "./events.ts";
import { commentOnce } from "./github.ts";
import { idOf } from "./ids.ts";
import { threadKey } from "./take.ts";

/*
 * How a manager asks a person, whatever for: a question of an agent, an action that waits for a yes, a limit that was reached, a model that
 * stopped. The ask is kept by the workspace (`asking`); what the manager keeps is how to go on once it is answered, under the ask's id.
 */

export const DAY = 86_400_000;

/** How a thing that asked goes on when it is answered. */
export type Parked =
  /** An agent's call waits for it: the thread goes on from the call. */
  | { readonly kind: "tool"; readonly thread: string }
  /** The work reached its limit: a thread waits for it, if one was working. */
  | { readonly kind: "limit"; readonly thread: string | null }
  /** The model did not answer: the job is tried again. */
  | { readonly kind: "model" }
  /** Whoever is working is told. */
  | { readonly kind: "plain" };

export interface Spec {
  readonly id: string;
  readonly person: string;
  readonly need: Need;
  readonly question: string;
  readonly why: string;
  readonly options: NewAsk["options"];
  readonly best: string | null;
  readonly shows: NewAsk["shows"];
  readonly by: number;
  readonly parked: Parked;
}

export type Opened =
  | { readonly _tag: "Asked" }
  | { readonly _tag: "Refused"; readonly why: string }
  | { readonly _tag: "Held"; readonly why: string };

export const askIdOf = (key: string): string => idOf("ask", key);

/** An ask of this id that was answered, in the words it was answered by. */
export function answeredOf(c: WorkingDeps, id: string): Answer | undefined {
  const kept = c.store.once(`answered:${id}`);
  return kept === undefined ? undefined : (JSON.parse(kept) as Answer);
}

const parkedOf = (c: WorkingDeps, id: string): Parked | undefined => {
  const kept = c.store.once(`asked:${id}`);
  return kept === undefined ? undefined : (JSON.parse(kept) as Parked);
};

/** A fresh ask id for a thing that can be asked again after it was answered: the first not yet answered. */
export function nextAskId(c: WorkingDeps, key: string): string {
  for (let n = 1; ; n += 1) {
    const id = askIdOf(n === 1 ? key : `${key}:${n}`);
    if (c.store.once(`answered:${id}`) === undefined) return id;
  }
}

/** What goes on the issue: the question, what can be answered, and what will be done, in the words it will be done in. */
function words(spec: Spec): string {
  const lines = [spec.question];
  if (spec.shows !== null) lines.push("", spec.shows.text);
  if (spec.options.length > 0)
    lines.push("", ...spec.options.map((option) => `- ${option.label}${option.id === spec.best ? " (best)" : ""}`));
  lines.push("", "Answer here by saying one of them, or in the inbox. The first answer counts.");
  return lines.join("\n");
}

/** Asked once by its id: the workspace keeps it, the issue says it, and the manager keeps how to go on. Doing it again finds it. */
export async function openAsk(c: WorkingDeps, work: Work, spec: Spec): Promise<Opened> {
  if (parkedOf(c, spec.id) !== undefined) return { _tag: "Asked" };
  const ask: NewAsk = {
    id: spec.id,
    to: spec.person,
    need: spec.need,
    about: { work: work.id, thread: threadKey(work.from), manager: c.manager.id, title: work.title },
    question: spec.question,
    why: spec.why,
    options: spec.options,
    best: spec.best,
    shows: spec.shows,
    by: Math.max(spec.by, c.clock.now() + 1),
    then: [],
    else: "wait",
  };
  const links = [{ label: work.title, link: `/m/${c.manager.id}/work/${work.id}` }];
  const opened = await c.outside.asks({
    op: "open",
    input: { ask, from: c.manager.name, kind: work.kind, person: work.asked, looked: [], otherwise: null, links },
  });
  if (opened.op !== "open") return { _tag: "Held", why: "The workspace did not take the ask." };
  if (opened.asked._tag === "Refused") return { _tag: "Refused", why: opened.asked.why };
  if (work.from.connector === "github") {
    const said = await commentOnce(c.outside, work.from.place, Number(work.from.id), words(spec), `ask:${spec.id}`);
    if (said._tag === "Cannot") return { _tag: "Held", why: said.why };
  }
  c.store.keepOnce(`asked:${spec.id}`, JSON.stringify(spec.parked));
  return { _tag: "Asked" };
}

/** What a tool says to its agent once its ask was answered. */
export const saidOf = (answer: Answer): string => `${answer.person} answered: ${answer.answer}.`;

/** The work waits for that person: it is shown on the board, and it is told when it goes quiet. */
export function waitsFor(c: WorkingDeps, work: Work, spec: Spec): void {
  apply(c, work.id, {
    key: `asked:${spec.id}`,
    at: c.clock.now(),
    is: "asked",
    ask: spec.id,
    person: spec.person,
    by: Math.max(spec.by, c.clock.now() + 1),
  });
}

/** The ids an option of this label gets: its words made plain, and not one that another has. */
export function optionsOf(labels: readonly string[], then: (label: string) => string): NewAsk["options"] {
  const used = new Set<string>();
  return labels.map((label, at) => {
    const plain =
      label
        .toLowerCase()
        .replaceAll(/[^a-z0-9]+/gu, "-")
        .replaceAll(/^-|-$/gu, "") || `option-${at + 1}`;
    let id = plain;
    for (let n = 2; used.has(id); n += 1) id = `${plain}-${n}`;
    used.add(id);
    return { id, label, then: then(label) };
  });
}

export { parkedOf };

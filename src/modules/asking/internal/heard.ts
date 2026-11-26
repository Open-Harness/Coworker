import type { Ask } from "~/modules/asks/types.ts";
import type { AskingDeps, Heard } from "../types.ts";
import { answerOnce } from "./answer.ts";
import { isFor } from "./who.ts";

/** What was said without the words that speak to someone, and the stop at the end: `@juno Add.` is `add`. */
const bare = (text: string): string =>
  text
    .trim()
    .replace(/^(?:@[\w-]+(?:\[bot\])?[\s,:]*)+/u, "")
    .replace(/[\s.!?,;:]+$/u, "")
    .toLowerCase();

/** The option of an ask that these words say, by its label or its id. */
const optionOf = (ask: Ask, words: string): string | undefined =>
  ask.options.find((option) => option.id.toLowerCase() === words || option.label.toLowerCase() === words)?.id;

/**
 * A comment on the thread an ask was made on, that says one of its options, answers it. Whose it is: the one asked, or, when the
 * place cannot say who someone is, someone it says may act there (for GitHub, who can write to the repo).
 */
export async function heard(c: AskingDeps, said: Heard): Promise<{ readonly ask: string; readonly work: string | null } | undefined> {
  const words = bare(said.text);
  if (words === "") return undefined;
  for (const kept of c.store.open()) {
    const { ask } = kept;
    if (ask.about.thread?.toLowerCase() !== said.thread.toLowerCase()) continue;
    const option = optionOf(ask, words);
    const theirs = said.person === null ? said.mayAct : isFor(ask, said.person);
    if (option === undefined || !theirs) continue;
    const answered = await answerOnce(c, kept, { by: said.name, answer: option, where: "github", may: true });
    if (answered._tag === "Answered") return { ask: ask.id, work: ask.about.work ?? null };
  }
  return undefined;
}

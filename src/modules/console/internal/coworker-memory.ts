import type { Did, Talking } from "~/modules/coworker/types.ts";
import { doings } from "~/modules/doings/service.ts";
import type { Note } from "~/modules/knowledge/types.ts";
import type { ConsoleDeps } from "../types.ts";
import { settingOr } from "./settings-kept.ts";

/* What the co-worker was told and what it is: its soul, the notes it keeps, the ways it speaks, and what it did. */

const NOTES = "note";
const SOUL = "coworker.soul";
const TALKING = "coworker.talking";

export const soulFor = (name: string, workspace: string): string =>
  `I am ${name}, the co-worker of ${workspace}. I answer from what is on record, I do what you may do, and I stop before what is yours to decide.`;

export const soulOf = async (c: ConsoleDeps, name: string): Promise<string> => settingOr(c.store, SOUL, soulFor(name, c.workspace.name));

const TEAM: Talking = {
  id: "team",
  who: "the team",
  is: { people: "team" },
  how: "Speak plainly and shortly. Say what you did, what you found, and what is left.",
  may: "Do what the person may do, and stop before what only a person decides.",
  sign: "",
};

export async function talkingOf(c: ConsoleDeps): Promise<readonly Talking[]> {
  const saved = await c.store.setting(TALKING);
  return Array.isArray(saved) && saved.length > 0 ? (saved as readonly Talking[]) : [TEAM];
}

/** Every note, kept or forgotten, oldest first. */
async function allNotes(c: ConsoleDeps): Promise<readonly Note[]> {
  return (await c.store.kept(NOTES)) as readonly Note[];
}

export async function notesOf(c: ConsoleDeps): Promise<readonly Note[]> {
  return (await allNotes(c)).filter(({ state }) => state === "kept");
}

/** What the co-worker was told, by whom and where, in a chat; kept at once, since a person inside said it. */
export async function keepNote(c: ConsoleDeps, says: string, where: string): Promise<Note> {
  const note: Note = {
    id: c.ids.next("note"),
    says,
    by: c.who.name,
    where,
    at: c.clock.now(),
    tell: "when it fits",
    used: null,
    state: "kept",
  };
  await c.store.keep(NOTES, note.id, note);
  await c.store.changed(["/coworker"]);
  return note;
}

/** The notes that were told to someone are used now. */
export async function usedNotes(c: ConsoleDeps, told: readonly Note[]): Promise<void> {
  for (const note of told) await c.store.keep(NOTES, note.id, { ...note, used: c.clock.now() });
}

export async function forgetNote(c: ConsoleDeps, id: string): Promise<Note | undefined> {
  const note = (await notesOf(c)).find((one) => one.id === id);
  if (note === undefined) return undefined;
  await c.store.keep(NOTES, id, { ...note, state: "forgotten" });
  await c.store.changed(["/coworker"]);
  return note;
}

export async function saveSoul(c: ConsoleDeps, text: string): Promise<void> {
  await c.store.set(SOUL, text);
  await c.store.changed(["/coworker"]);
}

/** What the co-worker did, newest first, as the audit log says it, with going back where the doing has a way back. */
export async function historyOf(c: ConsoleDeps): Promise<readonly (Did & { readonly undoLabel: string | null })[]> {
  const { lines } = await c.store.auditLines({ by: null, outcome: "done", before: null, limit: 50 });
  return lines
    .filter(({ kind }) => kind === "coworker")
    .map((row) => {
      const undo = doings.all.find(({ id }) => id === row.doing)?.undo ?? null;
      return {
        id: row.id,
        at: row.at,
        says: row.says,
        with: row.approvedBy ?? null,
        permission: row.permission,
        undo: undo === null ? ("cannot" as const) : ("can" as const),
        link: null,
        undoLabel: undo,
      };
    });
}

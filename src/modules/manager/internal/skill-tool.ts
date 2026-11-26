import type { ToolRegistration } from "@earendil-works/pi-durable";
import { obj, opt, str } from "@earendil-works/pi-schema";
import type { ToolEffects } from "./asking.ts";
import { BoardDoc, ProfileDoc } from "./state.ts";

const MAX_TEXT = 60_000;

const said = (text: string, isError = false) => ({ output: [{ type: "text" as const, text }], isError });

/**
 * Reads a file of a skill the run's agent had when the run started, at the version it had then. The files stay in the
 * workspace; the run asks for one at a time and is told which paths there are when it asks for one that is not there.
 */
export const readSkillTool = (effects: ToolEffects): ToolRegistration => ({
  name: "read_skill",
  description: "Read a file of one of your skills by its name and path inside it. Start with SKILL.md.",
  parameters: obj({ skill: str({ minLength: 1, maxLength: 100 }), path: opt(str({ maxLength: 200 })) }),
  replay: "safe",
  execute: async (args: { skill: string; path?: string }, api, context) => {
    const found = await api.commit(async (tx) => {
      const board = await tx.doc(BoardDoc);
      const run = Object.values(board.runs).find(({ conversationId }) => conversationId === Number(api.conversationId));
      const profile = (await tx.doc(ProfileDoc)).profile;
      if (run === undefined || profile === undefined) return undefined;
      const skills = (run.saved?.skills ?? []).map(({ id, name, version }) => ({ id, name, version }));
      return { skills, profile: { ...profile } };
    }, context);
    if (found === undefined) return said("This conversation is not a run.", true);
    const skill = found.skills.find(({ name }) => name === args.skill.trim());
    if (skill === undefined) {
      const names = found.skills.map(({ name }) => name);
      return said(names.length === 0 ? "You have no skills." : `You have no skill ${args.skill}. Your skills: ${names.join(", ")}`, true);
    }
    const path = args.path === undefined || args.path === "" ? "SKILL.md" : args.path;
    const read = await effects.workspace(found.profile).skillFile({ skill: skill.id, version: skill.version, path });
    if (read._tag === "Gone") return said(`The skill ${skill.name} (version ${skill.version}) is gone from the workspace.`, true);
    if (read._tag === "NoFile") return said(`${skill.name} has no ${path}. Its files: ${read.paths.join(", ")}`, true);
    return said(read.text.slice(0, MAX_TEXT));
  },
});

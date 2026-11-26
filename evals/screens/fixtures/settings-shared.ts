import { AGENTS } from "./settings-agents.ts";
import { ENVIRONMENTS } from "./settings-environments.ts";
import { SKILLS } from "./settings-skills.ts";
import { read, type Fixture } from "./read.ts";

/** What managers share: agents saved to use again, the skills, and where threads run. */
export const SHARED: readonly Fixture[] = [read("/settings/shared", {}, { agents: AGENTS, skills: SKILLS, environments: ENVIRONMENTS })];

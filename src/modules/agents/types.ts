import { arr, nullable, obj, oneOf, type Static, str } from "@earendil-works/pi-schema";

export const THINKING = ["off", "low", "medium", "high"] as const;

/** What a saved agent may switch on. `built: false` is accepted and saved, and no run has it yet. */
export const TOOLS = {
  bash: { label: "Run commands", built: true },
  read: { label: "Read files", built: true },
  edit: { label: "Edit files", built: false },
  web_fetch: { label: "Read web pages", built: false },
} as const;
export type ToolId = keyof typeof TOOLS;
/** The ones a run has. */
export type BuiltTool = { [K in ToolId]: (typeof TOOLS)[K]["built"] extends true ? K : never }[ToolId];
export const TOOL_IDS = Object.keys(TOOLS) as readonly ToolId[];

/** Until a workspace saves an agent of that name, a run with no agent named is this one. */
export const PLAIN_AGENT = "Worker";

/**
 * Every setting of a saved agent, once. `description` is what a person is told when a value is not allowed. The form
 * (`team-build`) has one control per setting here and does not compile without it.
 */
export const AGENT_SETTINGS = {
  name: str({
    minLength: 1,
    maxLength: 60,
    pattern: "^(?=.*\\S)[^\\u0000-\\u001F\\u007F-\\u009F]*$",
    description: "a name of up to 60 characters",
  }),
  instructions: str({ maxLength: 20_000, description: "words, at most 20000 characters" }),
  model: nullable(obj({ connectionId: str(), model: str() }), { description: "a connection and its model, or none for the workspace's" }),
  thinking: oneOf(THINKING, { description: `one of ${THINKING.join(", ")}` }),
  tools: arr(oneOf(TOOL_IDS), { description: `of ${TOOL_IDS.join(", ")}` }),
  /** By name. */
  skills: arr(str(), { description: "names of the workspace's skills" }),
  /** Where its commands run, by id. null: the plain container. */
  environment: nullable(str(), { description: "an environment's id, or none for the plain container" }),
} as const;

type Frozen<T> = T extends readonly (infer Item)[]
  ? readonly Frozen<Item>[]
  : T extends object
    ? { readonly [K in keyof T]: Frozen<T[K]> }
    : T;

/** A saved agent, whole. One version of it is one of these. */
export type AgentConfig = { readonly [K in keyof typeof AGENT_SETTINGS]: Frozen<Static<(typeof AGENT_SETTINGS)[K]>> };
export type AgentSetting = keyof AgentConfig;

/** What a setting is until someone says otherwise. */
export const BLANK_AGENT: AgentConfig = {
  name: "",
  instructions: "",
  model: null,
  thinking: "medium",
  tools: [],
  skills: [],
  environment: null,
};

/** A skill an agent names, as a run was given it: the version it can read, and the files in it. */
export interface RunSkill {
  /** Kept by id, so renaming the skill later leaves the run its files. */
  readonly id: string;
  readonly name: string;
  readonly version: number;
  readonly description: string;
  readonly files: readonly string[];
}

/**
 * A saved agent as a run takes it: what it was at the moment the run started. Editing or deleting the agent later
 * changes nothing here. Every setting an agent has is here without being named: it is the config, and the skills' own
 * versions in place of their names.
 */
export type RunAgent = Omit<AgentConfig, "skills"> & {
  readonly version: number;
  readonly skills: readonly RunSkill[];
};

export type Checked = { readonly ok: true; readonly value: AgentConfig } | { readonly ok: false; readonly reason: string };

/**
 * A config someone sent. A setting left out is its blank; one that is wrong, or is not a setting, is a refusal with the
 * reason in words.
 */
export type CheckAgentConfig = (sent: unknown) => Checked;
/** A config that was saved before. What cannot be read any more is its blank, so an old version always opens. */
export type ReadAgentConfig = (stored: unknown) => AgentConfig;
/** Whether two configs are the same agent, whatever order their settings were written in. */
export type SameAgentConfig = (one: AgentConfig, other: AgentConfig) => boolean;

import type { Clock, Ids } from "~/modules/clock/types.ts";
import type { UseResult } from "~/modules/vault/types.ts";

/*
 * Where a run's agent does its work: a container that starts from an Environment (the Environments screen). The
 * setup runs once per version and is kept as an image; each command after it starts from that image. Secrets reach
 * the container by name, through the vault, as process environment: never written into the script or a file.
 */

export const SIZES = ["1 vCPU · 2 GB", "2 vCPU · 4 GB", "4 vCPU · 8 GB"] as const;
export type Size = (typeof SIZES)[number];

export interface Environment {
  readonly id: string;
  readonly name: string;
  /**
   * Shell lines, run once per version. A line `export NAME=vault:<secret>` names a secret: the line is taken out of
   * the script and `NAME` is set from the vault when the container starts.
   */
  readonly setup: string;
  readonly size: Size;
  /** Goes up when the setup or the size changes; the setup then runs once more. */
  readonly version: number;
  readonly updatedAt: number;
}

export type BuildStatus = "Not started" | "Ready" | "Failed";

/** A row of the Environments screen. */
export interface EnvironmentView extends Environment {
  readonly status: BuildStatus;
  /** The agents that run in it. */
  readonly usedBy: readonly string[];
  /** The setup's output when it failed. */
  readonly output?: string | undefined;
}

/** A secret an Environment names, and the variable it becomes. */
export interface SecretRef {
  readonly env: string;
  readonly secret: string;
}

export type Env = Readonly<Record<string, string>>;

export interface CommandOutput {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
  /** How long the container ran, for the meter. */
  readonly seconds: number;
}

export type Prepared =
  | { readonly _tag: "Prepared"; readonly image: string; readonly seconds: number }
  | { readonly _tag: "SetupFailed"; readonly output: string; readonly seconds: number }
  | { readonly _tag: "Unavailable"; readonly reason: string };

/** The outside thing: Cloudflare Containers on staging, a table of scripted commands in the fast tier. */
export interface SandboxHost {
  /** Runs the setup in a fresh container and keeps what it made as an image. `key` names the environment's version. */
  readonly prepare: (input: { readonly key: string; readonly script: string; readonly size: Size; readonly env: Env }) => Promise<Prepared>;
  readonly exec: (input: { readonly image: string; readonly command: string; readonly env: Env }) => Promise<
    /** `kept`: the image of the container as the command left it, for the next command of the same run. */
    | { readonly _tag: "Ran"; readonly output: CommandOutput; readonly kept?: string | undefined }
    /** `expired`: what this image names is gone, so running the setup again would help. */
    | { readonly _tag: "Unavailable"; readonly reason: string; readonly expired?: true }
  >;
}

export interface SaveEnvironment {
  /** Absent for a new one. */
  readonly id?: string | undefined;
  readonly name: string;
  readonly setup: string;
  readonly size: Size;
}

export type SaveResult =
  | { readonly _tag: "Saved"; readonly environment: Environment }
  | { readonly _tag: "Invalid"; readonly reason: string }
  | { readonly _tag: "NoSuchEnvironment" };

/** Where an agent runs when nobody chose: an empty setup, so the first command starts at once. */
export const PLAIN: Environment = { id: "plain", name: "the plain container", setup: "", size: "2 vCPU · 4 GB", version: 1, updatedAt: 0 };

export type AssignResult = { readonly _tag: "Assigned" } | { readonly _tag: "NoSuchEnvironment" };

/** Who ran a command: the run, for the meter and the audit log. */
export interface CommandRequest {
  readonly agent: string;
  /** The environment the run took from its saved agent, by id; `null` for the plain container. Absent: the agent's name finds one. */
  readonly environment?: string | null;
  readonly command: string;
  readonly managerId: string;
  readonly run: string;
  /** Where the run's Task came from (its stored `ReplyAddress`), for the token a command may be given. */
  readonly thread?: unknown;
}

export type ExecOutcome =
  | { readonly _tag: "Ran"; readonly environment: string; readonly output: CommandOutput }
  /** The environment the run took has been deleted. A run does not move to another one halfway. */
  | { readonly _tag: "NoEnvironment"; readonly agent: string }
  | { readonly _tag: "MissingSecret"; readonly name: string }
  | { readonly _tag: "SetupFailed"; readonly output: string }
  | { readonly _tag: "Unavailable"; readonly reason: string }
  /** The workspace's spend limit is reached. */
  | { readonly _tag: "Stopped"; readonly reason: string };

export interface SandboxesDependencies {
  /** The Workspace object's own storage. */
  readonly sql: SqlStorage;
  readonly host: SandboxHost;
  /** Only `use`: a value is in memory for one call and never returned. */
  readonly secrets: { readonly use: <T>(name: string, fn: (plaintext: string) => Promise<T>) => Promise<UseResult<T>> };
  readonly clock: Clock;
  readonly ids: Ids;
  /** The saved agents that run in an environment: part of each agent, so asked for and not kept here. */
  readonly agents: () => readonly { readonly agent: string; readonly environment: string }[];
  /** Setups in flight, by version, so two runs starting at once share one. Owned by the object. */
  readonly building: Map<string, Promise<Prepared>>;
  /** The command each run is on, so its next one waits for it. Owned by the object. */
  readonly turns: Map<string, Promise<unknown>>;
}

/** One workspace's environments, which agent uses which, and the commands run in them. */
export interface Sandboxes {
  readonly environments: () => readonly EnvironmentView[];
  readonly save: (input: SaveEnvironment) => SaveResult;
  /** For an agent nobody saved: the plain Worker. `undefined` puts it in the plain container. */
  readonly assign: (agent: string, environmentId: string | undefined) => AssignResult;
  /**
   * `extra` is more process environment for this one command (a token made for it): hidden in the output, kept nowhere.
   * `onUsed` is told the container seconds this request used, each time some are recorded.
   */
  readonly exec: (request: CommandRequest, extra?: Env, onUsed?: (seconds: number) => void) => Promise<ExecOutcome>;
  /** Container seconds used since a time: setups and commands. */
  readonly used: (since: number) => number;
  readonly usedByManager: (since: number) => Readonly<Record<string, number>>;
  readonly usedByDay: (since: number) => readonly { readonly day: string; readonly seconds: number }[];
  /** Takes an environment away; agents that ran in it run in the plain container. Their names are returned. */
  readonly remove: (id: string) => readonly string[] | undefined;
  /** Runs the environment's setup now, and keeps what it made as the image of its current version. */
  readonly testStart: (id: string) => Promise<TestOutcome>;
}

export type TestOutcome =
  | { readonly _tag: "Tested"; readonly ready: boolean; readonly output: string; readonly seconds: number }
  | { readonly _tag: "MissingSecret"; readonly name: string }
  | { readonly _tag: "Unavailable"; readonly reason: string }
  | { readonly _tag: "NoSuchEnvironment" };

/*
 * Cloudflare Containers behind `SandboxHost`. One image; a Durable Object per container (its name is the box's name);
 * the size is chosen when the container starts. The platform's own container API is the seam: a `Boxes` is the
 * namespace of those objects, and `BoxContainer` is the part of `ctx.container` a box uses.
 */

/** The platform's instance types the three sizes run on. */
export type Instance = "standard-2" | "standard-3" | "standard-4";

/** One command in one fresh container. */
export interface BoxRun {
  readonly command: string;
  /** Process environment for this one command: where secrets go. Never a file, never the image. */
  readonly env: Env;
  readonly instance: Instance;
  /** Start from this snapshot of the root filesystem; the image when absent. */
  readonly snapshot?: string | undefined;
  /**
   * When the root filesystem is saved as a snapshot: a setup only if it succeeded, and not saving it is a failure. A
   * run's command whatever its exit code, and not saving it loses the files but not what the command said.
   */
  readonly save: "if it succeeds" | "always";
  readonly timeoutMs: number;
}

export interface BoxResult {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
  readonly seconds: number;
  /** Set when the platform failed (no image, a start or snapshot error), not the command. */
  readonly platformError?: string | undefined;
  /** The snapshot made, as `save` asked. */
  readonly snapshot?: string | undefined;
}

/** A box's Durable Object, as the Worker calls it (over RPC). */
export interface BoxHandle {
  readonly run: (input: BoxRun) => Promise<BoxResult>;
}

/** The namespace of boxes. A name is one container's life: a setup, or one command. */
export interface Boxes {
  readonly open: (name: string) => BoxHandle;
}

/** What a box uses of `ctx.container`, so it can be driven by a fake. */
export interface BoxContainer {
  readonly running: boolean;
  readonly images: Readonly<Record<string, string>>;
  readonly start: (
    options: ({ image: string; containerSnapshot?: never } | { image?: never; containerSnapshot: { id: string } }) & {
      entrypoint: string[];
      enableInternet: boolean;
      instance: Instance;
    },
  ) => void;
  readonly exec: (
    command: string[],
    options: { readonly env: Env; readonly signal: AbortSignal },
  ) => Promise<{
    readonly output: () => Promise<{ readonly exitCode: number; readonly stdout: ArrayBuffer; readonly stderr: ArrayBuffer }>;
  }>;
  readonly snapshotContainer: (options: { readonly name: string }) => Promise<{ readonly id: string }>;
  readonly destroy: () => Promise<void>;
}

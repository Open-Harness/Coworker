import type { Env, SandboxHost, Size } from "./types.ts";

/** What a scripted command prints, or a function of the environment it ran with. */
export interface Scripted {
  readonly exitCode?: number;
  readonly stdout?: string;
  readonly stderr?: string;
  readonly seconds?: number;
  /** The image the command leaves for its run's next one; none when absent. */
  readonly leaves?: string;
}

export interface FakeSandboxes extends SandboxHost {
  /** The answer to one exact command. Unknown commands are "not found". */
  readonly script: (command: string, answer: Scripted | ((env: Env) => Scripted | Promise<Scripted>)) => void;
  /** How long each setup takes, and the output it fails with, if it should. */
  readonly setup: { seconds: number; failWith: string | undefined };
  /** Every setup it ran: the script it was given and the environment it ran with. */
  readonly prepared: { readonly key: string; readonly script: string; readonly size: Size; readonly env: Env }[];
  readonly ran: { readonly image: string; readonly command: string; readonly env: Env }[];
}

/** The fast tier's containers: a table of commands and what they print. */
export function fakeSandboxes(): FakeSandboxes {
  const answers = new Map<string, Scripted | ((env: Env) => Scripted | Promise<Scripted>)>();
  const prepared: FakeSandboxes["prepared"] = [];
  const ran: FakeSandboxes["ran"] = [];
  const setup: FakeSandboxes["setup"] = { seconds: 60, failWith: undefined };
  return {
    script: (command, answer) => void answers.set(command, answer),
    setup,
    prepared,
    ran,
    prepare: async (input) => {
      prepared.push({ ...input, env: { ...input.env } });
      if (setup.failWith !== undefined) return { _tag: "SetupFailed", output: setup.failWith, seconds: setup.seconds };
      return { _tag: "Prepared", image: `image:${input.key}`, seconds: setup.seconds };
    },
    exec: async (input) => {
      ran.push({ ...input, env: { ...input.env } });
      const found = answers.get(input.command);
      const answer = typeof found === "function" ? await found(input.env) : found;
      if (answer === undefined) {
        return { _tag: "Ran", output: { exitCode: 127, stdout: "", stderr: `${input.command}: command not found`, seconds: 1 } };
      }
      return {
        _tag: "Ran",
        output: { exitCode: answer.exitCode ?? 0, stdout: answer.stdout ?? "", stderr: answer.stderr ?? "", seconds: answer.seconds ?? 1 },
        kept: answer.leaves,
      };
    },
  };
}

/** One fake for the Worker and the tests in one isolate. */
export const sandboxWorld: FakeSandboxes = fakeSandboxes();

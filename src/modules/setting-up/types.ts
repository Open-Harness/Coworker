import type { Call, Models } from "~/modules/completion/types.ts";
import type { Files } from "~/modules/playbook/types.ts";
import type { TurnThread } from "~/modules/turns/types.ts";
import type { Walkthrough } from "~/modules/walkthrough/types.ts";

/*
 * Setting a manager up from a sentence, as it goes on: a person says what they want to get to, the co-worker answers with one event at a
 * time through its `set_up` tool, the person answers it, and code says what may happen at each step (`walkthrough`). Nothing is made before
 * ten cases are judged and a yes. Everything outside is given.
 */

export type Made = { readonly _tag: "Made" } | { readonly _tag: "Refused"; readonly why: string };

export interface SetUpDeps {
  /** What is kept of each set-up, by its id. */
  readonly walks: {
    readonly get: (id: string) => Promise<Walkthrough | undefined>;
    readonly put: (walk: Walkthrough) => Promise<void>;
  };
  /** The co-worker's conversation for one set-up. */
  readonly thread: (walk: string) => TurnThread;
  readonly models: () => Promise<Models>;
  readonly call: Call;
  readonly newId: () => string;
  /** What is wrong with a draft, each in words with its file and line. Nothing: it can be made. */
  readonly problems: (draft: Files) => Promise<readonly string[]>;
  /** The manager, made from the draft and the cases judged, with the id the walkthrough gave it. */
  readonly make: (walk: Walkthrough) => Promise<Made>;
  /** A comment on a manager's page: a change another manager could carry. */
  readonly comment: (input: { readonly manager: string; readonly text: string; readonly by: string }) => Promise<void>;
}

export type Said = { readonly _tag: "Said"; readonly walk: Walkthrough } | { readonly _tag: "Refused"; readonly why: string };

export interface SettingUp {
  /** What a person said they want to get to: a set-up begins, and the co-worker is asked for the first event. */
  readonly start: (deps: SetUpDeps, by: string, said: string) => Promise<{ readonly walk: string; readonly note: string | null }>;
  /** What a person says in it, as the page sends it. `by` is who they are, never what was sent. `Gone`: there is no such set-up. */
  readonly say: (deps: SetUpDeps, walk: string, by: string, event: unknown) => Promise<Said | { readonly _tag: "Gone" }>;
  readonly get: (deps: SetUpDeps, walk: string) => Promise<Walkthrough | undefined>;
}

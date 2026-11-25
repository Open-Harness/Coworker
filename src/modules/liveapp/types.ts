import type { GitHubConnection } from "~/modules/github/types.ts";
import type { BoardView, ChatLine, RunView } from "~/modules/manager/types.ts";
import type { EventEntry, ManagerEntry } from "~/modules/workspace/types.ts";

/*
 * The live runner's own client of the app (book section 2: "a person on email" is also the test workspace's Owner).
 * It signs in for real, through the emailed sign-in link, and sets the test workspace up over the app's own API,
 * the same calls a browser makes, so staging is tested as a customer would use it. Everything is idempotent: a second
 * run finds what the first made.
 */

export type Fetch = (input: string, init?: RequestInit) => Promise<Response>;

export interface Failed {
  readonly _tag: "Failed";
  readonly reason: string;
}

/** A signed-in person: requests carry their cookie and the app's own origin. */
export interface Session {
  readonly send: (method: string, path: string, body?: unknown) => Promise<Response>;
  readonly json: <T>(method: string, path: string, body?: unknown) => Promise<T>;
}

export interface SignIn {
  readonly baseUrl: string;
  readonly fetch: Fetch;
  /** The Owner's address: the sign-in link is emailed there. */
  readonly email: string;
  readonly name: string;
  /**
   * Asks for the link (`request` makes the app send it) and returns it once the mail arrives: the caller reads its own
   * mailbox, so this module never knows how.
   */
  readonly obtainLink: (request: () => Promise<Response>) => Promise<string | undefined>;
}

export interface Seed {
  /** `live`: the workspace's address, and so the managers' mail addresses `launch.live@<mail domain>`. */
  readonly workspace: { readonly address: string; readonly name: string };
  /** The workspace's own model endpoint: `coworker-fake-model`. */
  readonly endpoint: { readonly label: string; readonly baseUrl: string; readonly key?: string };
  readonly manager: { readonly name: string; readonly address: string };
  /** Who may ask the manager: by email address, and by GitHub user id. */
  readonly allow: { readonly emails: readonly string[]; readonly githubIds: readonly string[] };
  /** A repo the manager hears (issues and their comments), once the App is installed. */
  readonly repo?: string;
  /** An environment with no setup, which the agent `Worker` runs its commands in. */
  readonly environment?: string;
}

export interface Provisioned {
  readonly workspace: string;
  readonly manager: ManagerEntry;
  /** `/api/workspaces/<id>/managers/<manager>`. */
  readonly base: string;
  readonly github: GitHubConnection;
}

export interface LiveApp {
  readonly signIn: (input: SignIn) => Promise<Session | Failed>;
  readonly provision: (session: Session, seed: Seed) => Promise<Provisioned | Failed>;
  readonly board: (session: Session, on: Provisioned) => Promise<BoardView>;
  readonly events: (session: Session, on: Provisioned) => Promise<readonly EventEntry[]>;
  readonly chat: (session: Session, on: Provisioned, text: string, requestId: string) => Promise<Response>;
  readonly run: (
    session: Session,
    on: Provisioned,
    runId: string,
  ) => Promise<{ readonly run: RunView; readonly lines: readonly ChatLine[] }>;
}

export const isFailed = (value: unknown): value is Failed =>
  typeof value === "object" && value !== null && "_tag" in value && value._tag === "Failed";

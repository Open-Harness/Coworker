import type { ManagerObjects } from "~/modules/manager/types.ts";
import type { Auth } from "~/modules/auth/types.ts";
import type { Workspaces } from "~/modules/workspaces/types.ts";
import type { GitHubApi } from "~/modules/github/types.ts";
import type { SignedIn } from "~/modules/auth/types.ts";
import type { Console, Member } from "~/modules/console/types.ts";
import type { WorkspaceApi } from "~/modules/workspace/types.ts";
import type { WorkspaceEntry } from "~/modules/workspaces/types.ts";

/** What the Worker builds a console from: the workspace as this person reached it, and who is in it. */
export interface ConsoleInput {
  readonly object: WorkspaceApi;
  readonly entry: WorkspaceEntry;
  readonly since: number;
  readonly person: SignedIn;
  readonly me: Member;
  readonly people: readonly Member[];
  readonly workspaces: Workspaces;
}
export type ConsoleFor = (input: ConsoleInput) => Console;

export interface Upgradable {
  fetch(request: Request): Promise<Response>;
}

export interface HttpDependencies {
  readonly directory: () => Upgradable;
  readonly workspace: (workspaceId: string) => Upgradable;
  /** The console's reads and doings, under `/api/ws`. Without it, none is answered. */
  readonly console?: ConsoleFor;
  /** Everything that is not the API: the pages. */
  readonly pages: (request: Request) => Promise<Response>;
  /** Sign-in and workspaces, built on first use in a request. */
  readonly control: () => {
    readonly auth: Auth;
    readonly workspaces: Workspaces;
    readonly managers: ManagerObjects;
    readonly github: GitHubApi;
  };
}

/** The app's HTTP surface: sign-in, workspaces, two sockets, who-am-I, a health check, and the pages. */
export type CreateHttp = (dependencies: HttpDependencies) => (request: Request) => Promise<Response>;

import type { ManagerObjects } from "~/modules/manager/types.ts";
import type { Auth } from "~/modules/auth/types.ts";
import type { Workspaces } from "~/modules/workspaces/types.ts";
import type { GitHubApi } from "~/modules/github/types.ts";

export interface Upgradable {
  fetch(request: Request): Promise<Response>;
}

export interface HttpDependencies {
  readonly directory: () => Upgradable;
  readonly workspace: (workspaceId: string) => Upgradable;
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

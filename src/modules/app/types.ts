import type { DirectoryClient, Source } from "~/modules/directory-client/types.ts";
import type { Person } from "~/modules/protocol/types.ts";
import type { WorkspaceClient } from "~/modules/manager-client/types.ts";

/** What the page shares between its screens: who is here, the directory, and the workspace being looked at. */
export interface Session {
  readonly me: Person;
  readonly directory: DirectoryClient;
  readonly workspaces: Workspaces;
  /** Unsent text, by chat. */
  readonly drafts: Map<string, string>;
}

/** One workspace is connected at a time; looking at another replaces it. */
export interface Workspaces {
  readonly current: Source<WorkspaceClient | undefined>;
  select(workspaceId: string): WorkspaceClient;
  close(): void;
}

/** The browser's side of signing in. The session itself is a cookie the browser keeps. */
export interface Account {
  /** Who the server says is signed in; `undefined` when nobody is. */
  readonly me: () => Promise<Person | undefined>;
  /** Emails a sign-in link that comes back to `returnTo`. `false` when the server refused. */
  readonly sendLink: (email: string, returnTo: string) => Promise<boolean>;
}

export interface AppDependencies {
  readonly account: Account;
  /** The socket address of a path on this server. */
  readonly socketUrl: (path: string) => string;
  /** The page's own path, for a sign-in link to come back to. */
  readonly here: () => string;
  readonly reload: () => void;
  /** The address people share, of a path on this server. */
  readonly shareUrl: (path: string) => string;
}

export interface DocumentSearch {
  readonly doc?: string;
  readonly v?: number;
}
export interface LandingProps {
  readonly workspaceId?: string;
}
export interface ChatScreenProps {
  readonly workspaceId: string;
  readonly chatId: number;
  readonly search: DocumentSearch;
}
export interface SettingsScreenProps {
  readonly workspaceId: string;
}

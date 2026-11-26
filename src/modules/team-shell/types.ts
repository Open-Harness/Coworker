import type { ReactNode } from "react";
import type { Standing } from "~/modules/access/types.ts";
import type { PermissionSet } from "~/modules/actions/types.ts";
import type { KeyListener, Loaded, SettingsPage } from "~/modules/team-core/types.ts";

/* The frame around every screen of the hosted app: the sidebar, the workspace switcher and search. */

export interface WorkspaceChoice {
  readonly workspaceId: string;
  readonly name: string;
  readonly address: string;
  /** Owners open Settings. */
  readonly role: "owner" | "builder" | "member";
}

export type Template = "kanban" | "incident" | "support" | "research";

export interface ManagerLink {
  readonly managerId: string;
  readonly name: string;
  readonly address: string;
}

/** A manager's `id` is its `managerId`. A person's `id` is their person id, and `managerId` is empty. */
export interface SearchResult {
  readonly kind: "page" | "task" | "manager" | "person";
  readonly id: string;
  readonly managerId: string;
  readonly title: string;
  readonly snippet: string;
}

export interface NewManager {
  readonly name: string;
  readonly template: Template;
}

export interface ShellApi {
  readonly workspaces: () => Promise<Loaded<readonly WorkspaceChoice[]>>;
  readonly managers: (workspaceId: string) => Promise<Loaded<readonly ManagerLink[]>>;
  /** What an Owner changed for this person over their preset: with the role, what decides which pages they may open. */
  readonly own: (workspaceId: string) => Promise<Loaded<PermissionSet>>;
  /** How many Inbox items wait for this person. */
  readonly waiting: (workspaceId: string) => Promise<Loaded<number>>;
  readonly search: (workspaceId: string, query: string) => Promise<Loaded<readonly SearchResult[]>>;
  readonly createManager: (workspaceId: string, input: NewManager) => Promise<Loaded<ManagerLink>>;
}

/** Which screen is open, read from its address. */
export type Place =
  | { readonly kind: "home" | "inbox" | "people" | "environments" }
  | {
      readonly kind: "manager";
      readonly managerId: string;
      readonly page: "board" | "chat" | "overview" | "mission" | "events" | "settings";
    }
  | { readonly kind: "build"; readonly page: "agents" | "skills" | "templates" }
  | { readonly kind: "settings"; readonly page: SettingsPage }
  | { readonly kind: "elsewhere" };

/** What the sidebar shows. */
export interface NavData {
  readonly workspace: WorkspaceChoice;
  readonly workspaces: readonly WorkspaceChoice[];
  readonly managers: readonly ManagerLink[];
  readonly waiting: number;
  readonly me: string;
  /** The role and own changes that decide which pages the sidebar offers. */
  readonly standing: Standing;
}

export interface AppNavProps {
  readonly nav: NavData;
  readonly place: Place;
  readonly onSignOut: () => void;
  readonly onSearch: () => void;
  readonly onNewManager: () => void;
  /** At the end of the sidebar: what setting up left to do. */
  readonly extra?: ReactNode;
}

export interface TeamShellProps {
  readonly api: ShellApi;
  /** Without it, search opens from its sidebar item only. */
  readonly listenKeys?: KeyListener;
  readonly workspaceId: string;
  /** The open screen's path. */
  readonly path: string;
  readonly me: string;
  readonly onSignOut: () => void;
  readonly onGo: (address: string) => void;
  /** Only Owners see it, at the end of the sidebar. */
  readonly gettingStarted?: ReactNode;
  readonly children: ReactNode;
}

export interface WorkspacesPageProps {
  readonly api: ShellApi;
  /** What someone in no workspace sees. */
  readonly empty: ReactNode;
}

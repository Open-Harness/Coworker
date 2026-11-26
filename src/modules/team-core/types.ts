/*
 * What every screen of the hosted app stands on: the line to the server, the addresses of the screens, and what is
 * shown while something loads or after it failed.
 */

export type Loaded<T> =
  | { readonly _tag: "Loaded"; readonly value: T }
  /** `retry` is set by `useLoading`: asking again, so that every screen that failed to load can offer it. */
  | { readonly _tag: "Failed"; readonly message: string; readonly retry?: () => void };

export type Json = Readonly<Record<string, unknown>>;

/** Narrows the server's JSON. `undefined` is an answer that made no sense. */
export type Decode<T> = (body: unknown) => T | undefined;

export type Send = (path: string, init?: RequestInit) => Promise<Response>;

/** The HTTP API, as screens use it: JSON in, narrowed values or the server's own words for the failure out. */
export interface Server {
  /** Where the app is served, such as `https://app.co-worker.tech`. */
  readonly origin: string;
  readonly read: <T>(path: string, decode: Decode<T>) => Promise<Loaded<T>>;
  readonly write: <T>(method: "POST" | "PUT" | "DELETE", path: string, body: unknown, decode: Decode<T>) => Promise<Loaded<T>>;
  /** Puts a file's own bytes, such as a logo, rather than JSON. */
  readonly upload: <T>(path: string, file: Blob, decode: Decode<T>) => Promise<Loaded<T>>;
}

/** What the browser does for the app, given by the route file. Nothing else reaches for a browser global. */
export interface Browser {
  /** The page's own path and search, for a sign-in link to come back to. */
  readonly here: () => string;
  /** Leaves the app for another page, such as a provider's. */
  readonly goTo: (url: string) => void;
  /** A fresh id for a message, so sending it twice is one message. */
  readonly newId: () => string;
  /** Hears every key pressed in the app until the returned function is called, for shortcuts such as opening search. */
  readonly listenKeys?: KeyListener;
}

export type KeyListener = (onKey: (event: KeyboardEvent) => void) => () => void;

/** A screen's data: what loaded last, and asking again. */
export interface Loading<T> {
  readonly loaded: Loaded<T> | undefined;
  readonly reload: () => void;
  /** Shows a newer value the server already gave, such as the answer to a save. */
  readonly show: (value: T) => void;
}

/** The sections of a manager's own Settings, and the pages Builders work on. */
export type ManagerSection = "sources" | "who-may-ask" | "permissions" | "board";
export type BuildPage = "agents" | "skills" | "templates";

export type SettingsPage =
  | "profile"
  | "notifications"
  | "general"
  | "members"
  | "roles"
  | "keys"
  | "usage"
  | "billing"
  | "security"
  | "audit";

/** A step of setting up a workspace. The first, making it, is at `start`. */
export type StartStep = "model" | "manager" | "mission" | "listen" | "invite";

export interface StartOptions {
  readonly managerId?: string | undefined;
  readonly template?: string | undefined;
  /** Only this step, opened from Getting started, rather than one of a row. */
  readonly only?: boolean | undefined;
}

/** Where the hosted app's screens are. */
export interface TeamLinks {
  readonly home: string;
  readonly start: string;
  readonly step: (workspaceId: string, step: StartStep, options?: StartOptions) => string;
  /** Home: what needs you and how the work is going. */
  readonly workspace: (workspaceId: string) => string;
  readonly inbox: (workspaceId: string) => string;
  readonly item: (workspaceId: string, itemId: string) => string;
  readonly people: (workspaceId: string) => string;
  readonly environments: (workspaceId: string) => string;
  readonly settings: (workspaceId: string, page: SettingsPage) => string;
  readonly board: (workspaceId: string, managerId: string) => string;
  readonly chat: (workspaceId: string, managerId: string) => string;
  readonly overview: (workspaceId: string, managerId: string) => string;
  readonly mission: (workspaceId: string, managerId: string, pageId?: string) => string;
  /** `source` opens one source's own page: `github` or `email`. */
  readonly managerSettings: (workspaceId: string, managerId: string, section?: ManagerSection, source?: string) => string;
  readonly events: (workspaceId: string, managerId: string) => string;
  readonly task: (workspaceId: string, managerId: string, taskId: string) => string;
  readonly run: (workspaceId: string, managerId: string, runId: string) => string;
  readonly build: (workspaceId: string, page: BuildPage, itemId?: string) => string;
}

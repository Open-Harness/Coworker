import type { ReactNode } from "react";
import type { Loaded, StartStep } from "~/modules/team-core/types.ts";
import type { Role, SettingsApi } from "~/modules/team-settings/types.ts";

/*
 * Setting up a workspace: making it, then a step each for models, a first manager, its mission, where it listens and
 * who else is invited. What is skipped comes back in Getting started, in the sidebar.
 */

export interface NewWorkspace {
  readonly name: string;
  readonly address: string;
  readonly region: "eu" | "us";
}

export type Template = "kanban" | "incident" | "support" | "research";

export interface NewManager {
  readonly name: string;
  readonly template: Template;
  readonly mission: string;
}

export interface ManagerAt {
  readonly managerId: string;
  readonly name: string;
  readonly address: string;
}

/** What making a workspace answered. A taken address may be the person's own company. */
export type Made =
  | { readonly kind: "made"; readonly workspaceId: string }
  | { readonly kind: "taken" }
  | { readonly kind: "failed"; readonly message: string };

/** The GitHub repos one manager hears. */
export interface Hearing {
  /** Everything the installation reaches. */
  readonly repos: readonly string[];
  readonly heard: readonly string[];
}

/** One line of Getting started. */
export interface Task {
  readonly key: "model" | "manager" | "email" | "github" | "invite" | "question";
  readonly label: string;
  readonly isDone: boolean;
  readonly href: string;
}

export interface StartApi {
  readonly createWorkspace: (input: NewWorkspace) => Promise<Made>;
  readonly workspaceName: (workspaceId: string) => Promise<Loaded<string>>;
  readonly managers: (workspaceId: string) => Promise<Loaded<readonly ManagerAt[]>>;
  readonly createManager: (workspaceId: string, input: NewManager) => Promise<Loaded<ManagerAt>>;
  /** Writes in a manager's chat. The same `requestId` twice is one message. */
  readonly say: (workspaceId: string, managerId: string, text: string, requestId: string) => Promise<Loaded<true>>;
  readonly hearing: (workspaceId: string, managerId: string) => Promise<Loaded<Hearing>>;
  readonly hear: (workspaceId: string, managerId: string, repos: readonly string[]) => Promise<Loaded<true>>;
  /** Getting started, for an Owner. */
  readonly progress: (workspaceId: string) => Promise<Loaded<readonly Task[]>>;
  /** Keys, invites, links and the GitHub connection are the settings' own. */
  readonly settings: SettingsApi;
}

export interface CreateWorkspacePageProps {
  readonly api: StartApi;
  readonly onGo: (address: string) => void;
  /** Someone with a workspace already can go back to it. */
  readonly hasOthers: boolean;
}

export interface StartPageProps {
  readonly api: StartApi;
  readonly workspaceId: string;
  readonly step: StartStep;
  readonly managerId?: string | undefined;
  readonly template?: string | undefined;
  readonly only: boolean;
  readonly onGo: (address: string) => void;
}

/** What each step is given, and where it goes when it is done or skipped. */
export interface StepProps {
  readonly api: StartApi;
  readonly workspaceId: string;
  readonly frame: Frame;
  readonly next: (done: NextOptions) => void;
}

export interface NextOptions {
  readonly managerId?: string | undefined;
  readonly template?: Template | undefined;
}

/** The page around a step: which workspace, how far along, and how to leave. */
export interface Frame {
  /** The workspace's name, once there is one. */
  readonly workspace?: string | undefined;
  /** Zero-based; absent when a step is opened by itself. */
  readonly step?: number | undefined;
  readonly leave?: { readonly label: string; readonly href: string } | undefined;
}

export interface WizardProps {
  readonly frame: Frame;
  readonly title: string;
  readonly description: string;
  readonly failure?: { readonly title: string; readonly description?: string | undefined } | undefined;
  readonly children: ReactNode;
  readonly action: ReactNode;
  readonly skip?: ReactNode;
}

export interface GitHubInstalledPageProps {
  readonly api: StartApi;
  /** `<workspace>~<manager>~<proof>`, as the install page was opened with. The manager may be empty. */
  readonly state: string;
  /** What GitHub signs the person in with. Used once. */
  readonly code: string;
  readonly installationId: number | undefined;
  readonly onGo: (address: string) => void;
}

export interface GettingStartedProps {
  readonly api: StartApi;
  readonly workspaceId: string;
  /** The open screen's path: leaving one is when something may have been done. */
  readonly path: string;
}

export type Invited = { readonly email: string; readonly role: Role };

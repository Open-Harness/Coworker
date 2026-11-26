import type { PermissionSet, PersonPreset } from "~/modules/actions/types.ts";

/*
 * Which pages a person may open. The shell hides the rest and says so at their address; the server refuses their
 * data. Both ask `mayOpen`, so the two cannot drift apart.
 */

/** A page of the hosted app, by what it is, not where it is. */
export type Page =
  // Everyone's own.
  | "home"
  | "inbox"
  | "chat"
  | "people"
  | "environments"
  | "profile"
  | "notifications"
  // A manager's pages, each behind the read action it shows.
  | "overview"
  | "board"
  | "task"
  | "run"
  | "mission"
  | "events"
  // A manager's Settings, every section of them.
  | "manager-settings"
  // What Owners and Builders shape.
  | "agents"
  | "skills"
  | "templates"
  // The workspace's eight settings pages, from General to Audit log.
  | "workspace";

/** Who someone is in a workspace: their preset, and what an Owner changed for them on top of it. */
export interface Standing {
  readonly role: PersonPreset;
  readonly own: PermissionSet;
}

/** Whether the person may open the page. */
export type MayOpen = (standing: Standing, page: Page) => boolean;

/** Whether the person may do one catalogue action (`manager.create`, say), as the server will check it. */
export type MayDo = (standing: Standing, actionId: string) => boolean;

import type { Browser, Page } from "@playwright/test";
import { acme, type Acme } from "./acme.ts";
import { api } from "./settings.ts";
import { signedIn } from "./team.ts";

/** The five kinds of person the access eval walks the app as. */
export type Who = "owner" | "builder" | "member" | "granted" | "narrowed";

export interface Everyone {
  readonly app: Acme;
  /** Each person's own browser, signed in. */
  readonly pages: Readonly<Record<Who, Page>>;
}

async function joined(browser: Browser, owner: Page, workspaceId: string, email: string, name: string, role: "builder" | "member") {
  const invited = await api<{ id: string }>(owner, "POST", "/api/auth/organization/invite-member", {
    email,
    role,
    organizationId: workspaceId,
  });
  const theirs = await signedIn(browser, email, name);
  await api(theirs, "POST", "/api/auth/organization/accept-invitation", { invitationId: invited.id });
  return theirs;
}

const change = (owner: Page, workspaceId: string, email: string, key: string, value: "on" | "off") =>
  api(owner, "PUT", `/api/workspaces/${workspaceId}/permissions`, { person: `email:${email}`, scope: "action", key, value });

/**
 * A lived-in workspace and five people in it: the Owner, a Builder, a Member, a Member an Owner let make managers, and a
 * Builder an Owner took three reads from (the mission, the events and a manager's settings).
 */
export async function everyone(browser: Browser, tag: string): Promise<Everyone> {
  const app = await acme(browser, tag);
  const { page: owner, id } = app;
  const mail = (name: string): string => `${name}${tag}@acme.test`;
  // Outside the approved domain, which would let them in as Members before their invitation is taken.
  const outside = (name: string): string => `${name}${tag}@partner.test`;
  const builder = await signedIn(browser, mail("bo.larsen"), "Bo Larsen");
  const member = await signedIn(browser, mail("chidi.okafor"), "Chidi Okafor");
  const granted = await joined(browser, owner, id, outside("mia.quist"), "Mia Quist", "member");
  const narrowed = await joined(browser, owner, id, outside("noor.aziz"), "Noor Aziz", "builder");
  await change(owner, id, outside("mia.quist"), "manager.create", "on");
  for (const key of ["mission.read", "event.read", "policy.read"]) await change(owner, id, outside("noor.aziz"), key, "off");
  return { app, pages: { owner, builder, member, granted, narrowed } };
}

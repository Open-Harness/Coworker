import type { Answer } from "~/modules/api/types.ts";
import { connectors } from "~/modules/connectors/service.ts";
import type { Who } from "~/modules/doings/types.ts";
import type { Grant, Reach } from "~/modules/reach/types.ts";
import type { Surroundings } from "~/modules/playbook/types.ts";
import { tree } from "~/modules/tree/service.ts";
import type { ManagerNode, Rolled } from "~/modules/tree/types.ts";
import type { Person } from "~/modules/views-workspace/types.ts";
import type { ConsoleDeps, Member } from "../types.ts";

/* What every view reads from: the person, the tree, the accounts, what is around a playbook. */

export const BASE_TOOLS = ["read", "write", "edit", "bash", "web_read", "note", "ask", "done_when", "report", "skill", "check", "judge"];
/** The craft skills the product comes with, which a playbook may name without having their files. */
export const LIBRARY_SKILLS = ["review", "answer-a-review", "short-mail", "github", "email", "work", "untrusted"];

export const ok = <T>(value: T): Answer<T> => ({ _tag: "Ok", value });
export const problem = (status: 401 | 403 | 404 | 409 | 422 | 429 | 500, says: string): Answer<never> => ({
  _tag: "Problem",
  status,
  says,
});

const initialsOf = (name: string): string =>
  name
    .split(/\s+/u)
    .filter((part) => part !== "")
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

export const personOf = (member: Member): Person => ({
  id: member.id,
  name: member.name,
  role: member.role,
  initials: initialsOf(member.name),
});
export const whoOf = (member: Member): Who => ({ id: member.id, name: member.name, is: "person", role: member.role, own: {} });

/** The accounts there are in this workspace, what each reaches, and what a playbook may be checked against. */
export interface Account {
  readonly id: string;
  readonly as: string;
  readonly works: boolean;
  readonly places: readonly string[];
  readonly since: number;
  /** Why it does not work, when it does not. */
  readonly says?: string;
}

export async function accountsOf(c: ConsoleDeps): Promise<readonly Account[]> {
  const [github, lost] = await Promise.all([c.outside.github(), c.outside.lost()]);
  const found: Account[] = [{ id: "email", as: c.mailbox, works: true, places: [c.mailbox], since: c.workspace.since }];
  if (github.installation !== undefined)
    found.unshift({
      id: "github",
      as: c.app === null ? github.installation.account : `${c.app}[bot]`,
      works: true,
      places: github.installation.repos,
      since: c.workspace.since,
    });
  else if (lost !== undefined)
    found.unshift({
      id: "github",
      as: c.app === null ? lost.account : `${c.app}[bot]`,
      works: false,
      says: `The App was uninstalled from ${lost.account}. Install it again, and the managers hear their repos once more.`,
      places: [...new Set(lost.sources.map(({ repo }) => repo))],
      since: lost.at,
    });
  return found;
}

const connector = (id: string) => connectors.all.find((one) => one.id === id);

/** Everything every connected account may do, anywhere it reaches: the most a manager under no other can have. */
export const wholeOf = (accounts: readonly Account[]): Reach => ({
  grants: accounts.map((account): Grant => ({
    account: account.id,
    place: "*",
    may: Object.fromEntries((connector(account.id)?.actions ?? []).map((action) => [action.id, "on" as const])),
  })),
  limits: {},
});

export async function surroundings(c: ConsoleDeps, above: Reach): Promise<Surroundings> {
  const [accounts, connections] = await Promise.all([accountsOf(c), c.outside.connections()]);
  return {
    people: c.people.map(({ id }) => id),
    accounts: accounts.map(({ id }) => ({
      id,
      actions: (connector(id)?.actions ?? []).map((action) => action.id),
      events: (connector(id)?.events ?? []).map((event) => event.id),
    })),
    skills: LIBRARY_SKILLS,
    tools: BASE_TOOLS,
    models: connections.flatMap((one) => one.models.map((model) => ({ connection: one.id, model }))),
    above,
  };
}

/** What each manager is doing, as far as anything is counted yet. */
export const idle = (node: ManagerNode): Rolled => ({
  id: node.id,
  came: 0,
  work: 0,
  out: 0,
  open: 0,
  waiting: 0,
  cost: 0,
  is: node.state === "paused" ? "paused" : "idle",
});

export const rolled = (nodes: readonly ManagerNode[]): readonly Rolled[] => tree.roll(nodes, nodes.map(idle));

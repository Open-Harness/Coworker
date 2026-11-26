import type { CoworkerView, HomeView, ChatsView, ShellView } from "~/modules/views-workspace/types.ts";
import type { Identity } from "~/modules/coworker/types.ts";
import { doings } from "~/modules/doings/service.ts";
import type { ConsoleDeps } from "../types.ts";
import { accountsOf, personOf, rolled, whoOf } from "./around.ts";
import { inboxItems } from "./inbox.ts";
import { spendingParts } from "./spending.ts";
import { settingOr } from "./settings-kept.ts";
import { historyOf, notesOf, soulOf, talkingOf } from "./coworker-memory.ts";

/* The shell and the pages that are about the person and the co-worker, before any manager has anything to say. */

export async function identityOf(c: ConsoleDeps): Promise<Identity> {
  const [name, accounts] = await Promise.all([settingOr(c.store, "coworker.name", "Juno"), accountsOf(c)]);
  return {
    name,
    role: "Your co-worker",
    since: c.workspace.since,
    addresses: accounts.map(({ id, as, works }) => ({ connector: id, as, works })),
  };
}

export async function shellView(c: ConsoleDeps): Promise<ShellView> {
  const [rows, zone, identity, waiting] = await Promise.all([
    c.store.managers(),
    settingOr(c.store, "zone", "UTC"),
    identityOf(c),
    inboxItems(c),
  ]);
  const nodes = rows.map(({ node }) => node);
  const now = new Map(rolled(nodes).map((one) => [one.id, one]));
  return {
    workspace: { id: c.workspace.id, name: c.workspace.name, address: c.workspace.address, zone },
    me: personOf(c.who),
    coworker: identity,
    tree: nodes
      .filter(({ state }) => state !== "retired")
      .map((node) => ({
        id: node.id,
        name: node.name,
        above: node.above,
        is: now.get(node.id)?.is ?? "idle",
        icon: node.template?.id === "repo" ? "git" : "manager",
        now: node.state === "paused" ? "Paused" : "Waiting for something to come in",
      })),
    people: c.people.map(personOf),
    chats: [],
    inbox: waiting.length,
    triggers: 0,
    doings: doings.offered(whoOf(c.who)),
  };
}

export const homeView = (): HomeView => ({
  suggestions: [
    {
      id: "set-up-a-manager",
      category: "set",
      heading: "Set up a manager",
      about: "Pick a template and a place, and it starts.",
      prompt: "Set up a manager for my repo",
      link: null,
    },
    {
      id: "what-came-in",
      category: "know",
      heading: "What came in",
      about: "See what reached the managers today.",
      prompt: "What came in today?",
      link: null,
    },
    {
      id: "get-an-issue-done",
      category: "do",
      heading: "Get an issue done",
      about: "Give a manager an issue to take to a pull request.",
      prompt: "Take the next issue",
      link: null,
    },
    {
      id: "show-me-how",
      category: "learn",
      heading: "Show me how",
      about: "Watch the co-worker do it on the screen.",
      prompt: "Show me how to make a manager",
      link: null,
    },
  ],
  recent: [],
});

export const chatsView = (): ChatsView => ({ chats: [] });

const NEVER = ["Spend more than a manager's own limit", "Do what only a person may decide", "Say a secret"];

export async function coworkerView(c: ConsoleDeps): Promise<CoworkerView> {
  const [identity, perDay, parts, notes, history, talking] = await Promise.all([
    identityOf(c),
    settingOr(c.store, "perDay", 100),
    spendingParts(c),
    notesOf(c),
    historyOf(c),
    talkingOf(c),
  ]);
  const self = { id: "coworker", name: identity.name, is: "coworker", role: "Member", own: {} } as const;
  return {
    identity,
    offline: [],
    voice: "calm",
    aloud: false,
    soul: await soulOf(c, identity.name),
    never: NEVER,
    mayPropose: true,
    talking,
    triggers: [],
    skills: [],
    setUp: {
      skill: "set-up",
      version: 1,
      since: c.workspace.since,
      unchanged: { now: 0, aim: 0.8 },
      noChange: { count: 0, of: 0, goneSince: 1 },
      trying: "",
      drafts: 0,
      files: [],
    },
    memory: notes,
    corrections: [],
    may: doings.all.map((one) => ({
      doing: one.id,
      label: one.label,
      group: one.group,
      is: doings.may(one.id, self).is,
      from: doings.may(one.id, self).why,
    })),
    spending: { whole: perDay, tellAt: 0.8, parts },
    history,
  };
}

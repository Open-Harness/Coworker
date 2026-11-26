import type { Identity } from "~/modules/coworker/types.ts";
import type { HomeView, SearchView, ShellView } from "~/modules/views-workspace/types.ts";
import { DOINGS } from "./workspace-doings.ts";
import { AMA, PEOPLE } from "./workspace-people.ts";
import { CHATS, MINE } from "./workspace-chats.ts";
import { at, read, type Fixture } from "./read.ts";

export const JUNO: Identity = {
  name: "Juno",
  role: "Acme’s co-worker",
  since: at("14 Sep 10:00"),
  addresses: [
    { connector: "email", as: "juno@acme.co-worker.tech", works: true },
    { connector: "whatsapp", as: "+44 7700 900123", works: false },
    { connector: "slack", as: "@juno in acme.slack.com", works: true },
    { connector: "github", as: "juno-acme[bot]", works: true },
  ],
};

type Node = ShellView["tree"][number];
const node = (id: string, name: string, above: string | null, is: Node["is"], icon: string, now: string): Node => ({
  id,
  name,
  above,
  is,
  icon,
  now,
});

export const SHELL: ShellView = {
  workspace: { id: "ws-acme", name: "Acme", address: "acme", zone: "Europe/Copenhagen" },
  me: AMA,
  coworker: JUNO,
  tree: [
    node("root", "Juno", null, "working", "", "Trying version 5 of Support on past mail"),
    node("coding", "Coding", "root", "working", "code-bracket", "4 threads, newest on ACME-423"),
    node("docs", "Docs", "coding", "idle", "", "Waiting for the next merge"),
    node("releases", "Releases", "coding", "needs you", "", "Asks to cut v2.3 without the 150k fix"),
    node("support", "Support", "root", "stuck", "lifebuoy", "WhatsApp number offline for 2 hours"),
    node("whatsapp", "WhatsApp desk", "support", "stuck", "", "Not connected since 08:10"),
    node("sales", "Sales", "root", "working", "megaphone", "2 threads, writing to new leads"),
  ],
  people: PEOPLE,
  chats: MINE,
  inbox: 3,
  triggers: 8,
  doings: DOINGS,
};

type Suggestion = HomeView["suggestions"][number];
const card = (
  category: Suggestion["category"],
  heading: string,
  about: string,
  prompt: string,
  link: string | null = null,
): Suggestion => ({
  id: `${category}-${heading.toLowerCase().replaceAll(/[^a-z0-9]+/gu, "-")}`,
  category,
  heading,
  about,
  prompt,
  link,
});

export const HOME: HomeView = {
  suggestions: [
    card("set", "Get to something", "Say what you want. Juno plans it, tries it, then makes it", "I want ", "/set-up"),
    card("set", "Connect a second number", "You scan one code, Juno does the rest", "Connect our second WhatsApp number."),
    card("set", "Look at it every Monday", "A trigger, by the clock", "Every Monday at 8, tell me "),
    card("set", "Change how you write to customers", "Juno writes that way from the next mail on", "When you write to customers, "),
    card("know", "What needs a person today?", "Three things wait for you", "What needs a person today?"),
    card("know", "Why is Support slower?", "You asked this at 09:18", "Why is Support slower?", "/chats/support"),
    card("know", "What did we spend, and on what?", "By manager, and by piece of work", "What did we spend this week, and on what?"),
    card("know", "What did you send to Northwind?", "Every mail and message, by anyone", "What did you send to Northwind this month?"),
    card("do", "Take something on", "Say what done means, or let Juno ask", "Take this on: "),
    card("do", "Answer the review on #418", "One comment is open", "Answer the review on #418."),
    card("do", "Write to Pat Reyes", "You see it before it goes", "Write to Pat Reyes about the Monday export."),
    card("do", "Stop something", "A thread, a manager or everything", "Stop "),
    card("learn", "Make a manager", "Juno does it on the screen, slowly", "Show me how to make a manager.", "/walk/make-a-manager"),
    card("learn", "Read a board", "What the lanes mean, on your own work", "Show me how to read a board."),
    card("learn", "Take over a conversation", "And hand it back", "Show me how to take over a conversation."),
    card("learn", "Undo what you did", "Anything Juno changed", "Show me how to undo what you did."),
  ],
  recent: MINE,
};

type Found = SearchView["found"][number];
const found = (is: Found["is"], id: string, title: string, about: string, link: string, when = "25 Nov 09:54"): Found => ({
  is,
  id,
  title,
  about,
  link,
  at: at(when),
});

/** Whatever the palette is asked for: the server picks by the words, and the fixture gives the story's things. */
export const SEARCH: SearchView = {
  found: [
    found("work", "ACME-412", "ACME-412  Export drops rows over 150k", "Review comments answered", "/m/coding/work/ACME-412"),
    found("work", "ACME-398", "ACME-398  Drop Node 18", "Your answer", "/m/coding/work/ACME-398"),
    ...CHATS.map((chat) => found("chat", chat.id, chat.title, `${chat.with}, ${chat.where}`, `/chats/${chat.id}`, "25 Nov 09:31")),
    ...PEOPLE.map((person) => found("person", person.id, person.name, person.role, "/settings/members", "25 Nov 09:00")),
  ],
};

export const SHELL_FIXTURES: readonly Fixture[] = [read("/shell", {}, SHELL), read("/home", {}, HOME), read("/search?words", {}, SEARCH)];

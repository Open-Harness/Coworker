import type { SearchableItem } from "@astryxdesign/core/Typeahead";
import type { ShellView, SearchView } from "~/modules/views-workspace/types.ts";

export type Kind = "ask" | "go" | "do" | "show" | "work" | "chat" | "person" | "trigger";
export interface Aux {
  readonly group: string;
  readonly kind: Kind;
  readonly to: string;
  readonly note: string;
  readonly keys?: string;
}
export type Item = SearchableItem<Aux>;

const GROUP: Readonly<Record<Kind, string>> = {
  ask: "Ask",
  go: "Go to",
  do: "Do",
  show: "Show me how",
  work: "Work",
  chat: "Chats",
  person: "People",
  trigger: "Triggers",
};
const item = (kind: Kind, id: string, label: string, to: string, note: string, more: { readonly keys?: string } = {}): Item => ({
  id: `${kind}:${id}`,
  label,
  auxiliaryData: { group: GROUP[kind], kind, to, note, ...(more.keys === undefined ? {} : { keys: more.keys }) },
});

/** The co-worker, asked about the page you are on. */
export const ask = (label: string, note: string): Item => item("ask", "juno", label, "/", note);

/** Where a person can go, from what the shell holds. */
export function pagesOf(shell: ShellView): readonly Item[] {
  const name = shell.coworker.name;
  return [
    item("go", "overview", "Overview", "/overview", "All managers together"),
    item("go", "inbox", "Inbox", "/inbox", `${shell.inbox} wait for you`),
    item("go", "chats", "All chats", "/chats", `Everyone ${name} speaks with`),
    item("go", "juno", `About ${name}`, "/juno", "Name, addresses, soul"),
    item("go", "triggers", "Triggers", "/juno/triggers", `${shell.triggers}, of all managers`),
    item("go", "managers", "All managers", "/managers", "Where it splits the work"),
    ...shell.tree.filter((node) => node.id !== "root").map((node) => item("go", node.id, node.name, `/m/${node.id}`, node.now)),
  ];
}

export const doingsOf = (shell: ShellView): readonly Item[] =>
  shell.doings.map((doing) =>
    item("do", doing.id, doing.label, doing.at.page, doing.group, doing.keys === undefined ? {} : { keys: doing.keys }),
  );

/** A doing with fields can be shown: the co-worker does it on the screen while you watch. */
export const showingOf = (shell: ShellView): readonly Item[] =>
  shell.doings
    .filter((doing) => doing.fields.length > 0)
    .map((doing) => item("show", doing.id, doing.label, `/walk/${doing.id}`, `${shell.coworker.name} does it while you watch`));

/** What the shell already knows how to find: chats and people. Work and the rest come from the server, by the words. */
export const knownOf = (shell: ShellView): readonly Item[] => [
  ...shell.chats.map((chat) => item("chat", chat.id, chat.title, `/chats/${chat.id}`, `${chat.with}, ${chat.where}`)),
  ...shell.people.map((person) => item("person", person.id, person.name, "/settings/members", person.role)),
];

const KIND: Readonly<Record<SearchView["found"][number]["is"], Kind>> = {
  work: "work",
  thread: "work",
  manager: "go",
  person: "person",
  playbook: "work",
  mail: "work",
  deal: "work",
  chat: "chat",
};
export const foundOf = (view: SearchView): readonly Item[] =>
  view.found.map((one) => item(KIND[one.is], `${one.is}-${one.id}`, one.title, one.link, one.about));

/** What shows before anything is typed: the things people do most, how to be shown one, and the first pages. */
export function firstOf(shell: ShellView): readonly Item[] {
  const doing = doingsOf(shell);
  const first = ["manager.create", "work.add", "trigger.add", "connector.connect"].flatMap((id) =>
    doing.filter((one) => one.id === `do:${id}`),
  );
  return [...first, ...showingOf(shell).slice(0, 1), ...pagesOf(shell).slice(0, 5)];
}

/** The first character narrows it, for people who want that. */
export function narrowed(shell: ShellView, found: readonly Item[], mark: string): readonly Item[] | undefined {
  const kinds = (...of: readonly Kind[]) => [...knownOf(shell), ...found].filter((one) => of.includes(one.auxiliaryData?.kind ?? "ask"));
  if (mark === ">") return doingsOf(shell);
  if (mark === "?") return showingOf(shell);
  if (mark === "#") return kinds("work");
  if (mark === "@") return kinds("person", "chat");
  return undefined;
}

export function matching(all: readonly Item[], query: string): readonly Item[] {
  const words = query.toLowerCase().split(/\s+/u).filter(Boolean);
  return all.filter((one) => {
    const text = `${one.label} ${one.auxiliaryData?.note ?? ""}`.toLowerCase();
    return words.every((word) => text.includes(word));
  });
}

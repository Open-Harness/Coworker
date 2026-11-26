import { playbooks } from "~/modules/playbook/service.ts";
import type { SearchView } from "~/modules/views-workspace/types.ts";
import type { ConsoleDeps } from "../types.ts";
import { ok } from "./around.ts";

/* Search: every word of the query, in any case, in what this person may see: work, managers, people, playbook lines and their own chats. */

type Found = SearchView["found"][number];

const holds = (text: string, words: readonly string[]): boolean => {
  const low = text.toLowerCase();
  return words.every((word) => low.includes(word));
};

export async function searchView(c: ConsoleDeps, query: URLSearchParams) {
  const words = (query.get("words") ?? "")
    .toLowerCase()
    .split(/\s+/u)
    .filter((word) => word !== "");
  if (words.length === 0) return ok<SearchView>({ found: [] });
  const found: Found[] = [];
  for (const row of (await c.store.managers()).filter(({ node }) => node.state !== "retired")) {
    const { node } = row;
    const store = c.managers.get(row.objectId, row.region);
    if (holds(node.name, words))
      found.push({ is: "manager", id: node.id, title: node.name, about: "Manager", link: `/m/${node.id}`, at: row.at });
    for (const { work } of await store.board())
      if (holds(`${work.title} ${work.about}`, words))
        found.push({
          is: "work",
          id: work.id,
          title: work.title,
          about: `${node.name}: ${work.kind}`,
          link: `/m/${node.id}/work/${work.id}`,
          at: work.ended?.at ?? row.at,
        });
    const version = await store.version();
    const read = version === undefined ? undefined : playbooks.read(version.files);
    if (read?._tag === "Playbook")
      for (const { line, text } of playbooks.lines(read.playbook))
        if (holds(text, words))
          found.push({
            is: "playbook",
            id: `${node.id}:${line}`,
            title: line,
            about: text.slice(0, 160),
            link: `/m/${node.id}/playbook`,
            at: version?.at ?? row.at,
          });
  }
  for (const person of c.people)
    if (holds(`${person.name} ${person.email}`, words))
      found.push({ is: "person", id: person.id, title: person.name, about: person.role, link: "/settings/members", at: c.workspace.since });
  for (const chat of await c.store.chats(c.who.id))
    if (holds(`${chat.title} ${chat.lines.map(({ text }) => text).join(" ")}`, words))
      found.push({
        is: "chat",
        id: chat.id,
        title: chat.title,
        about: chat.lines.at(-1)?.text ?? "",
        link: `/chats/${chat.id}`,
        at: chat.at,
      });
  return ok<SearchView>({ found });
}

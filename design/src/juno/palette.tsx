/* One palette for everything: ask, go, do, find, and be shown. It reads the same list of actions as the buttons and Juno. */
import { useMemo } from "react";
import { CommandPalette, CommandPaletteFooter, CommandPaletteInput } from "@astryxdesign/core/CommandPalette";
import { Icon } from "@astryxdesign/core/Icon";
import { Kbd } from "@astryxdesign/core/Kbd";
import { HStack, StackItem } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import type { SearchableItem } from "@astryxdesign/core/Typeahead";
import { AcademicCapIcon, ArrowRightIcon, BoltIcon, ChatBubbleLeftRightIcon, ClockIcon, MagnifyingGlassIcon, SparklesIcon, UserIcon } from "@heroicons/react/24/outline";
import { MANAGERS, PEOPLE, WORK } from "../world";
import { ACTIONS } from "./actions";
import { CHATS, TRIGGERS } from "./world";

type Kind = "ask" | "go" | "do" | "show" | "work" | "chat" | "person" | "trigger";
interface Aux { group: string; kind: Kind; to: string; note: string; keys?: string }
type Item = SearchableItem<Aux>;
const ICON = { ask: SparklesIcon, go: ArrowRightIcon, do: BoltIcon, show: AcademicCapIcon, work: MagnifyingGlassIcon, chat: ChatBubbleLeftRightIcon, person: UserIcon, trigger: ClockIcon } as const;
const GROUP: Readonly<Record<Kind, string>> = { ask: "Ask", go: "Go to", do: "Do", show: "Show me how", work: "Work", chat: "Chats", person: "People", trigger: "Triggers" };
const item = (kind: Kind, id: string, label: string, to: string, note: string, more: Partial<Aux> = {}): Item => ({ id: `${kind}:${id}`, label, auxiliaryData: { group: GROUP[kind], kind, to, note, ...more } });

const PAGES: readonly Item[] = [
  item("go", "overview", "Overview", "system", "All managers together"), item("go", "inbox", "Inbox", "inbox", "3 wait for you"), item("go", "chats", "All chats", "chats", "Everyone Juno speaks with"),
  item("go", "juno", "About Juno", "juno-about", "Name, addresses, soul"), item("go", "triggers", "Triggers", "juno-triggers", `${TRIGGERS.length}, of all managers`), item("go", "managers", "All managers", "root", "Where it splits the work"),
  ...MANAGERS.filter((m) => m.id !== "root").map((m) => item("go", m.id, m.name, `m-${m.id}-overview`, m.now)),
];
const DOING: readonly Item[] = ACTIONS.map((a) => item("do", a.id, a.label, a.go, a.group, a.keys ? { keys: a.keys } : {}));
const SHOWING: readonly Item[] = ACTIONS.filter((a) => a.fields.length > 0).map((a) => item("show", a.id, a.label, a.id === "manager.create" ? "setup" : "soon-Show me", "Juno does it while you watch"));
const FINDING: readonly Item[] = [
  ...WORK.map((w) => item("work", w.id, `${w.id}  ${w.title}`, w.id === "ACME-412" ? "task" : "soon-Task", w.next)),
  ...CHATS.flatMap((c) => [c, ...(c.forks ?? [])]).map((c, i) => item("chat", `${i}`, c.title, c.id, `${c.who}, ${c.where}`)),
  ...Object.values(PEOPLE).map((p) => item("person", p.id, p.name, "soon-Person", p.role)),
  ...TRIGGERS.map((r) => item("trigger", r.id, r.name, "juno-triggers", r.when)),
];
const FIRST = [...["manager.create", "work.add", "trigger.add", "connector.connect"].flatMap((id) => DOING.filter((d) => d.id === `do:${id}`)), ...SHOWING.slice(0, 1), ...PAGES.slice(0, 5)];
/** The first character narrows it, for people who want that. */
const NARROW: Readonly<Record<string, readonly Item[]>> = { ">": DOING, "#": FINDING.filter((i) => i.auxiliaryData?.kind === "work"), "@": FINDING.filter((i) => i.auxiliaryData?.kind === "person" || i.auxiliaryData?.kind === "chat"), "?": SHOWING };

function find(all: readonly Item[], q: string) {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  return all.filter((i) => { const t = `${i.label} ${i.auxiliaryData?.note ?? ""}`.toLowerCase(); return words.every((w) => t.includes(w)); });
}

function Row({ i }: { i: Item }) {
  const a = i.auxiliaryData!;
  return (
    <HStack gap={3} vAlign="center" width="100%">
      <Icon icon={ICON[a.kind]} size="sm" color="secondary" />
      <StackItem size="fill"><Text maxLines={1}>{i.label}</Text></StackItem>
      {a.note ? <Text type="supporting" color="secondary" maxLines={1}>{a.note}</Text> : null}
            {a.keys ? <Kbd keys={a.keys} /> : null}
    </HStack>
  );
}

export function Palette({ isOpen, onOpenChange, place, onGo }: { isOpen: boolean; onOpenChange: (o: boolean) => void; place: string; onGo: (to: string) => void }) {
  const source = useMemo(() => {
    const known = new Map<string, Item>();
    const keep = (xs: readonly Item[]) => { xs.forEach((x) => known.set(x.id, x)); return [...xs]; };
    const ask = (label: string, note: string) => item("ask", "juno", label, "home", note);
    return {
      known,
      bootstrap: () => keep([ask(`Ask Juno about ${place}`, "It sees the page you are on"), ...FIRST]),
      search: (raw: string) => {
        const q = raw.trim(); const only = NARROW[q[0] ?? ""];
        if (only) return keep(find(only, q.slice(1)));
        return keep([ask(`Ask Juno: “${q}”`, `It sees the page you are on: ${place}`), ...find([...DOING, ...SHOWING], q).slice(0, 5), ...find(PAGES, q).slice(0, 4), ...find(FINDING, q).slice(0, 6)]);
      },
    };
  }, [place]);
  return (
    <CommandPalette label="Ask, go, do or find" isOpen={isOpen} onOpenChange={onOpenChange} searchSource={source} width={680} maxHeight={560}
      input={<CommandPaletteInput placeholder="Ask Juno, go somewhere, do something, find anything" />}
      renderItem={(i) => <Row i={i as Item} />}
      footer={<CommandPaletteFooter><HStack gap={4} vAlign="center" wrap="wrap">{([[">", "do"], ["?", "show me how"], ["#", "work"], ["@", "people"]] as const).map(([k, t]) => <HStack key={k} gap={1} vAlign="center"><Kbd keys={k} /><Text type="supporting" color="secondary">{t}</Text></HStack>)}</HStack></CommandPaletteFooter>}
      onValueChange={(id) => { onOpenChange(false); const to = source.known.get(id)?.auxiliaryData?.to; if (to) onGo(to); }} />
  );
}

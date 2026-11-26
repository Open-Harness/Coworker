import { Avatar } from "@astryxdesign/core/Avatar";
import { Badge } from "@astryxdesign/core/Badge";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Icon } from "@astryxdesign/core/Icon";
import { HStack, Layout, LayoutContent, LayoutHeader, VStack } from "@astryxdesign/core/Layout";
import { List, ListItem } from "@astryxdesign/core/List";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { ToggleButton } from "@astryxdesign/core/ToggleButton";
import { ArrowUturnRightIcon, MagnifyingGlassIcon as SearchIcon } from "@heroicons/react/24/outline";
import { go } from "../../shell";
import { FILTERS, type Chat, type FilterId } from "./data";

const last = (c: Chat) => [...c.lines].reverse().find((l) => l.kind === "msg");

function lastLine(c: Chat): string {
  const l = last(c);
  if (!l || l.kind !== "msg") return "";
  const what = l.photo && !l.text ? "Photo" : l.text;
  return `${l.unsent ? "Not sent yet: " : l.side === "me" ? "Desk: " : ""}${what}`;
}

function ChatRow({ c, unread, isSelected, onOpen }: { c: Chat; unread: number; isSelected: boolean; onOpen: () => void }) {
  const l = last(c);
  return (
    <>
      <ListItem
        startContent={<Avatar name={c.name} size="md" />}
        label={c.name}
        description={lastLine(c)}
        endContent={
          <VStack gap={0.5} hAlign="end">
            <Text type="supporting" color="secondary">{l && l.kind === "msg" ? l.time : ""}</Text>
            {unread > 0 ? <Badge label={String(unread)} variant="neutral" /> : null}
          </VStack>
        }
        isSelected={isSelected}
        onClick={onOpen}
      />
      {c.work ? <ListItem startContent={<HStack paddingInlineStart={6}><Icon icon={ArrowUturnRightIcon} size="sm" /></HStack>} label={c.work.title} description={`Became ${c.work.id}`} onClick={() => go("m-coding-board")} density="compact" /> : null}
    </>
  );
}

/** The chats: a banner when the number is off, search, filters, then the rows. */
export function ChatList({ chats, unread, selected, q, onQ, filter, onFilter, onOpen }: {
  chats: readonly Chat[]; unread: Readonly<Record<string, number>>; selected: string | null; q: string; onQ: (q: string) => void;
  filter: FilterId; onFilter: (f: FilterId) => void; onOpen: (id: string) => void;
}) {
  return (
    <Layout
      height="fill"
      header={
        <LayoutHeader padding={2}>
          <VStack gap={2}>
            <Banner status="warning" title="Offline since 08:10" description="Nothing has come in since, and what the desk wrote after is not sent yet." endContent={<Button label="Scan the code" variant="secondary" size="sm" onClick={() => go("soon-Scan")} />} />
            <TextInput label="Search chats" isLabelHidden placeholder="Search chats..." value={q} onChange={onQ} startIcon={SearchIcon} hasClear />
            <HStack gap={1} wrap="wrap">
              {FILTERS.map((f) => <ToggleButton key={f.id} label={f.label} size="sm" isPressed={filter === f.id} onPressedChange={() => onFilter(f.id)} />)}
            </HStack>
          </VStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent padding={0}>
          <List edge="padded">
            {chats.map((c) => <ChatRow key={c.id} c={c} unread={unread[c.id] ?? 0} isSelected={c.id === selected} onOpen={() => onOpen(c.id)} />)}
          </List>
        </LayoutContent>
      }
    />
  );
}

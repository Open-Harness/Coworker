import type { ReactNode } from "react";
import { Avatar } from "@astryxdesign/core/Avatar";
import { Badge } from "@astryxdesign/core/Badge";
import { Icon } from "@astryxdesign/core/Icon";
import { HStack, Layout, LayoutContent, LayoutHeader, VStack } from "@astryxdesign/core/Layout";
import { List, ListItem } from "@astryxdesign/core/List";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { ToggleButton } from "@astryxdesign/core/ToggleButton";
import { ArrowUturnRightIcon, MagnifyingGlassIcon as SearchIcon } from "@heroicons/react/24/outline";
import { useGo } from "~/modules/page/service.ts";
import { FILTERS, type Chat, type FilterId } from "./chats.ts";

function ChatRow({
  c,
  unread,
  isSelected,
  workHref,
  onOpen,
}: {
  c: Chat;
  unread: number;
  isSelected: boolean;
  workHref: (id: string) => string;
  onOpen: () => void;
}) {
  const go = useGo();
  const work = c.work;
  return (
    <>
      <ListItem
        startContent={<Avatar name={c.name} size="md" />}
        label={c.name}
        description={c.last}
        endContent={
          <VStack gap={0.5} hAlign="end">
            <Text type="supporting" color="secondary">
              {c.time}
            </Text>
            {unread > 0 ? <Badge label={String(unread)} variant="neutral" /> : null}
          </VStack>
        }
        isSelected={isSelected}
        onClick={onOpen}
      />
      {work ? (
        <ListItem
          startContent={
            <HStack paddingInlineStart={6}>
              <Icon icon={ArrowUturnRightIcon} size="sm" />
            </HStack>
          }
          label={work.title}
          description={`Became ${work.id}`}
          onClick={() => go(workHref(work.id))}
        />
      ) : null}
    </>
  );
}

/** The chats: a banner when the number is off, search, filters, then the rows. */
export function ChatList({
  chats,
  banner,
  workHref,
  unread,
  selected,
  q,
  onQ,
  filter,
  onFilter,
  onOpen,
}: {
  chats: readonly Chat[];
  banner: ReactNode;
  workHref: (id: string) => string;
  unread: Readonly<Record<string, number>>;
  selected: string | null;
  q: string;
  onQ: (q: string) => void;
  filter: FilterId;
  onFilter: (f: FilterId) => void;
  onOpen: (id: string) => void;
}) {
  return (
    <Layout
      height="fill"
      header={
        <LayoutHeader padding={2}>
          <VStack gap={2}>
            {banner}
            <TextInput
              label="Search chats"
              isLabelHidden
              placeholder="Search chats..."
              value={q}
              onChange={onQ}
              startIcon={SearchIcon}
              hasClear
            />
            <HStack gap={1} wrap="wrap">
              {FILTERS.map((f) => (
                <ToggleButton key={f.id} label={f.label} size="sm" isPressed={filter === f.id} onPressedChange={() => onFilter(f.id)} />
              ))}
            </HStack>
          </VStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent padding={0}>
          <List edge="padded">
            {chats.map((c) => (
              <ChatRow
                key={c.id}
                c={c}
                workHref={workHref}
                unread={unread[c.id] ?? 0}
                isSelected={c.id === selected}
                onOpen={() => onOpen(c.id)}
              />
            ))}
          </List>
        </LayoutContent>
      }
    />
  );
}

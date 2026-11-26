// astryx-template: incident-console
import type { CSSProperties } from "react";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Icon } from "@astryxdesign/core/Icon";
import { HStack, VStack } from "@astryxdesign/core/Layout";
import { List, ListItem } from "@astryxdesign/core/List";
import { StatusDot, type StatusDotVariant } from "@astryxdesign/core/StatusDot";
import { Text } from "@astryxdesign/core/Text";
import { InboxArrowDownIcon } from "@heroicons/react/24/outline";
import { dayMonth } from "../manager-frame/words.ts";
import type { Came, State } from "./came.ts";

const ORDER: readonly State[] = ["ask", "watch", "took", "left"];
export const STATE: Readonly<Record<State, { readonly dot: StatusDotVariant }>> = {
  ask: { dot: "warning" },
  watch: { dot: "neutral" },
  took: { dot: "neutral" },
  left: { dot: "neutral" },
};
/** What each group is called. The one that waits names who it waits for. */
export const label = (state: State, asker: string | null): string =>
  state === "ask" ? `Waits for ${asker ?? "a person"}` : state === "watch" ? "Watched" : state === "took" ? "Taken on" : "Left alone";

const HEADER: CSSProperties = { padding: "var(--spacing-2) var(--spacing-3)", backgroundColor: "var(--color-background-muted)" };

export function Rows(props: {
  readonly items: readonly Came[];
  readonly selectedId: string | null;
  readonly onSelect: (id: string) => void;
  readonly isNarrow: boolean;
  readonly zone: string;
  readonly asker: string | null;
}) {
  const { items, selectedId, onSelect, isNarrow, zone, asker } = props;
  const groups = ORDER.map((state) => ({ state, items: items.filter((one) => one.state === state) })).filter((one) => one.items.length > 0);
  if (groups.length === 0)
    return (
      <EmptyState
        title="Nothing like that came in"
        description="Change how it came, or clear the search."
        icon={<Icon icon={InboxArrowDownIcon} size="lg" />}
      />
    );
  const when = (one: Came): string => (!isNarrow ? one.stamp : one.isToday ? (one.stamp.split(", ")[1] ?? "") : dayMonth(one.at, zone));
  return (
    <VStack gap={0}>
      {groups.map((group) => (
        <VStack gap={0} key={group.state}>
          <HStack gap={2} vAlign="center" style={HEADER}>
            <Text type="label" color="secondary">
              {label(group.state, asker)}
            </Text>
            <Text type="supporting" color="secondary">
              {group.items.length}
            </Text>
          </HStack>
          <List density="compact" hasDividers>
            {group.items.map((one) => (
              <ListItem
                key={one.id}
                label={one.title}
                description={`${one.feed} · ${one.why}`}
                {...(group.state === "ask" ? { startContent: <StatusDot variant="warning" label={label("ask", asker)} /> } : {})}
                endContent={
                  <HStack gap={3} vAlign="center">
                    {!isNarrow && one.work !== null && (
                      <Text type="supporting" color="secondary">
                        {one.work}
                      </Text>
                    )}
                    <Text type="supporting" color="secondary">
                      {when(one)}
                    </Text>
                  </HStack>
                }
                onClick={() => onSelect(one.id)}
                isSelected={one.id === selectedId}
              />
            ))}
          </List>
        </VStack>
      ))}
    </VStack>
  );
}

import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Icon } from "@astryxdesign/core/Icon";
import { HStack, VStack } from "@astryxdesign/core/Layout";
import { List, ListItem } from "@astryxdesign/core/List";
import { StatusDot, type StatusDotVariant } from "@astryxdesign/core/StatusDot";
import { Text } from "@astryxdesign/core/Text";
import { InboxArrowDownIcon } from "@heroicons/react/24/outline";
import { feed, type Came, type Verdict } from "../../sales";
import { styles } from "./styles";

const ORDER: readonly Verdict[] = ["ask", "watch", "took", "left"];
export const STATE: Readonly<Record<Verdict, { label: string; dot: StatusDotVariant }>> = {
  ask: { label: "Waits for Bo", dot: "warning" },
  watch: { label: "Watched", dot: "neutral" },
  took: { label: "Taken on", dot: "neutral" },
  left: { label: "Left alone", dot: "neutral" },
};

export function Rows({ items, selectedId, onSelect, isNarrow }: { items: readonly Came[]; selectedId: string | null; onSelect: (id: string) => void; isNarrow: boolean }) {
  const groups = ORDER.map((state) => ({ state, items: items.filter((c) => c.state === state) })).filter((g) => g.items.length > 0);
  if (groups.length === 0) return <EmptyState title="Nothing like that came in" description="Change how it came, or clear the search." icon={<Icon icon={InboxArrowDownIcon} size="lg" />} />;
  return (
    <VStack gap={0}>
      {groups.map((g) => (
        <VStack gap={0} key={g.state}>
          <HStack gap={2} vAlign="center" style={styles.groupHeader}>
            <Text type="label" color="secondary">{STATE[g.state].label}</Text>
            <Text type="supporting" color="secondary">{g.items.length}</Text>
          </HStack>
          <List density="compact" hasDividers>
            {g.items.map((c) => (
              <ListItem key={c.id} label={c.title} description={`${feed(c.feed).name} · ${c.why}`}
                {...(g.state === "ask" ? { startContent: <StatusDot variant="warning" label="Waits for Bo" /> } : {})}
                endContent={<HStack gap={3} vAlign="center">{!isNarrow && c.work && <Text type="supporting" color="secondary">{c.work}</Text>}<Text type="supporting" color="secondary">{isNarrow ? (c.at.startsWith("25 Nov") ? c.at.split(", ")[1] : c.at.split(",")[0]) : c.at}</Text></HStack>}
                onClick={() => onSelect(c.id)} isSelected={c.id === selectedId} />
            ))}
          </List>
        </VStack>
      ))}
    </VStack>
  );
}

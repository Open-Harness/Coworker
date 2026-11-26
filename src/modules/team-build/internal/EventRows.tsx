import { EmptyState } from "@astryxdesign/core/EmptyState";
import { HStack, VStack } from "@astryxdesign/core/Layout";
import { List, ListItem } from "@astryxdesign/core/List";
import { Section } from "@astryxdesign/core/Section";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { Text } from "@astryxdesign/core/Text";
import { Timestamp } from "@astryxdesign/core/Timestamp";
import { Token } from "@astryxdesign/core/Token";
import { type HeardRow, ORIGIN, OUTCOMES } from "./heard.ts";
import { seconds } from "./words.ts";

/** What arrived, grouped by what became of it, as `incident-console` groups its incidents by status. */
export function EventRows({
  rows,
  selectedId,
  isNarrow,
  onSelect,
}: {
  readonly rows: readonly HeardRow[];
  readonly selectedId: string | undefined;
  readonly isNarrow: boolean;
  readonly onSelect: (id: string) => void;
}) {
  const groups = OUTCOMES.map((outcome) => ({ ...outcome, items: rows.filter((row) => row.outcome === outcome.value) })).filter(
    ({ items }) => items.length > 0,
  );
  if (groups.length === 0) return <EmptyState title="Nothing matches" description="Clear the filters, or show everything." isCompact />;
  return (
    <VStack>
      {groups.map(({ value, label, dot, token, items }) => (
        <VStack key={value}>
          <Section variant="muted" padding={0} paddingInline={4} paddingBlock={2}>
            <HStack gap={2} vAlign="center">
              <Text type="label" color="secondary">
                {label}
              </Text>
              <Text type="supporting">{items.length}</Text>
            </HStack>
          </Section>
          <List density="compact" hasDividers aria-label={label}>
            {items.map((row) => (
              <ListItem
                key={row.id}
                label={row.title}
                description={[ORIGIN[row.origin], row.from, row.result].filter((part) => part !== "").join(" · ")}
                startContent={<StatusDot variant={dot} label={label} />}
                endContent={
                  <HStack gap={3} vAlign="center">
                    {!isNarrow && <Token size="sm" color={token} label={row.strength} />}
                    <Timestamp value={seconds(row.at)} format="relative" color="secondary" />
                  </HStack>
                }
                isSelected={row.id === selectedId}
                onClick={() => onSelect(row.id)}
              />
            ))}
          </List>
        </VStack>
      ))}
    </VStack>
  );
}

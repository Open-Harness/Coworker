import type { ReactNode } from "react";
import * as stylex from "@stylexjs/stylex";
import { VStack, HStack, StackItem } from "@astryxdesign/core/Layout";
import { Text, Heading } from "@astryxdesign/core/Text";
import { Icon } from "@astryxdesign/core/Icon";
import type { IconType } from "@astryxdesign/core/Icon";
import { Divider } from "@astryxdesign/core/Divider";
import { Badge } from "@astryxdesign/core/Badge";
import { Token } from "@astryxdesign/core/Token";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { List, ListItem } from "@astryxdesign/core/List";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { BellAlertIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import { go } from "../../shell";
import type { Work } from "../../world";
import { settledNow, waitingNow } from "./data";

const railStyles = stylex.create({
  // Translucent, so the band reads the same on a card and on the panel.
  header: { backgroundColor: "var(--color-background-muted)" },
  // The opaque layer the translucent band needs; without it the rows read
  // through the header as they scroll past.
  stickyHeader: { position: "sticky", insetBlockStart: 0, zIndex: 1, backgroundColor: "var(--color-background-surface)" },
});

/**
 * One labelled region of the rail. `hasStickyHeader` is the rail form: the panel
 * is a single scroll region shared with the sibling section, so the header pins
 * to its top. Folded inline, each section gets its own card.
 */
export function RailSection({ icon, iconColor, title, subtitle, badge, hasStickyHeader = false, children }: {
  icon: IconType; iconColor: "warning" | "secondary"; title: string; subtitle: string; badge: ReactNode; hasStickyHeader?: boolean; children: ReactNode;
}) {
  return (
    <VStack gap={0}>
      <VStack gap={0} xstyle={hasStickyHeader ? railStyles.stickyHeader : undefined}>
        <VStack gap={1} padding={4} xstyle={railStyles.header}>
          <HStack gap={2} vAlign="center">
            <Icon icon={icon} size="sm" color={iconColor} />
            <StackItem size="fill"><Heading level={3}>{title}</Heading></StackItem>
            {badge}
          </HStack>
          <Text type="supporting" color="secondary">{subtitle}</Text>
        </VStack>
        <Divider />
      </VStack>
      {children}
    </VStack>
  );
}

// ============= NEEDS SOMEONE =============

type Group = "you" | "person" | "settled";
const GROUP_TOKEN: Record<Group, { label: string; color: "yellow" | "gray" }> = {
  you: { label: "Waits for you", color: "yellow" },
  person: { label: "With a person", color: "yellow" },
  settled: { label: "Done", color: "gray" },
};
const GROUP_ORDER: Group[] = ["you", "person", "settled"];
const lowerFirst = (s: string) => (/^(An|Your|The) /.test(s) ? s[0]!.toLowerCase() + s.slice(1) : s);

function describe(w: Work, g: Group): string {
  if (g === "settled") return `${w.id} · ${w.about.replace(/\.$/, "")}`;
  return `${w.id} · Waits for ${lowerFirst(w.next)}`;
}

export function NeedsSomeone({ rows, hasStickyHeader = false }: { rows: readonly Work[]; hasStickyHeader?: boolean }) {
  const waiting = waitingNow(rows);
  const groups = GROUP_ORDER.map((g) => ({
    g,
    items: g === "settled" ? settledNow(rows) : waiting.filter((w) => (g === "you" ? w.waits === "you" : w.waits === "person")),
  })).filter((x) => x.items.length > 0);
  const needYou = waiting.filter((w) => w.waits === "you").length;

  return (
    <RailSection
      icon={BellAlertIcon}
      iconColor={needYou > 0 ? "warning" : "secondary"}
      title="Needs someone"
      subtitle={`${waiting.length} waiting, newest first`}
      badge={<Badge label={`${needYou} waits for you`} variant={needYou > 0 ? "warning" : "neutral"} />}
      hasStickyHeader={hasStickyHeader}>
      {groups.length === 0 ? (
        <EmptyState title="All clear" description="Nothing is waiting on anyone for this view." icon={<Icon icon={CheckCircleIcon} size="lg" color="success" />} isCompact />
      ) : (
        groups.map(({ g, items }) => (
          <List key={g} density="compact" hasDividers>
            {items.map((w) => (
              <ListItem
                key={w.id}
                label={w.title}
                description={describe(w, g)}
                onClick={() => go(w.id === "ACME-412" ? "task" : `soon-${w.id}`)}
                startContent={<StatusDot variant={g === "you" || g === "person" ? "warning" : "success"} label={GROUP_TOKEN[g].label} isPulsing={g === "you"} />}
                endContent={
                  <VStack gap={1} hAlign="end">
                    <Token size="sm" color={GROUP_TOKEN[g].color} label={GROUP_TOKEN[g].label} />
                    <Text type="supporting" color="secondary">{w.age} ago</Text>
                  </VStack>
                }
              />
            ))}
          </List>
        ))
      )}
    </RailSection>
  );
}

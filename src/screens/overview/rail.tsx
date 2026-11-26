// astryx-template: dashboard-alert-rail
import type { CSSProperties, ReactNode } from "react";
import { Badge } from "@astryxdesign/core/Badge";
import { Divider } from "@astryxdesign/core/Divider";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Icon } from "@astryxdesign/core/Icon";
import type { IconType } from "@astryxdesign/core/Icon";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Layout";
import { List, ListItem } from "@astryxdesign/core/List";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Token } from "@astryxdesign/core/Token";
import { BellAlertIcon, CheckCircleIcon, FunnelIcon } from "@heroicons/react/24/outline";
import { useClock, useGo, useRead } from "~/modules/page/service.ts";
import type { ManagerOverview } from "~/modules/views-manager/types.ts";
import { ago } from "../manager-frame/words.ts";

// Translucent, so the band reads the same on a card and on the panel.
const BAND: CSSProperties = { backgroundColor: "var(--color-background-muted)" };
// The opaque layer the translucent band needs; without it the rows read through the header as they scroll past.
const STICKY: CSSProperties = { position: "sticky", insetBlockStart: 0, zIndex: 1, backgroundColor: "var(--color-background-surface)" };

/** One labelled region of the rail. Inline, each section gets its own card; in the panel the header pins to the top. */
export function RailSection(props: {
  readonly icon: IconType;
  readonly iconColor: "warning" | "secondary";
  readonly title: string;
  readonly subtitle: string;
  readonly badge: ReactNode;
  readonly hasStickyHeader?: boolean;
  readonly children: ReactNode;
}) {
  const { icon, iconColor, title, subtitle, badge, hasStickyHeader = false, children } = props;
  return (
    <VStack gap={0}>
      <VStack gap={0} {...(hasStickyHeader ? { style: STICKY } : {})}>
        <VStack gap={1} padding={4} style={BAND}>
          <HStack gap={2} vAlign="center">
            <Icon icon={icon} size="sm" color={iconColor} />
            <StackItem size="fill">
              <Heading level={3}>{title}</Heading>
            </StackItem>
            {badge}
          </HStack>
          <Text type="supporting" color="secondary">
            {subtitle}
          </Text>
        </VStack>
        <Divider />
      </VStack>
      {children}
    </VStack>
  );
}

type Row = ManagerOverview["rail"][number];
type Group = "you" | "person" | "settled";
const TOKEN: Record<Group, { readonly label: string; readonly color: "yellow" | "gray" }> = {
  you: { label: "Waits for you", color: "yellow" },
  person: { label: "With a person", color: "yellow" },
  settled: { label: "Done", color: "gray" },
};
const ORDER: readonly Group[] = ["you", "person", "settled"];

/** Who it needs: what waits for you, what waits for another person, and what was settled. */
export function NeedsSomeone({ rows, hasStickyHeader = false }: { readonly rows: readonly Row[]; readonly hasStickyHeader?: boolean }) {
  const [go, clock, shell] = [useGo(), useClock(), useRead("/shell")];
  const people = shell._tag === "Ok" ? shell.value.people : [];
  const me = shell._tag === "Ok" ? shell.value.me.id : "";
  const first = (id: string): string => people.find((one) => one.id === id)?.name.split(" ")[0] ?? id;
  const waiting = rows.filter((row) => row.for !== null);
  const names = new Set(waiting.map((row) => row.for));
  // When only one other person is waited for, the rail names them instead of saying "a person".
  const only = names.size === 1 && !names.has(me) ? ([...names][0] ?? null) : null;
  const groupOf = (row: Row): Group => (row.for === null ? "settled" : row.for === me ? "you" : "person");
  const token = (group: Group): { readonly label: string; readonly color: "yellow" | "gray" } =>
    group === "person" && only !== null ? { label: `Waits for ${first(only)}`, color: "yellow" } : TOKEN[group];
  const groups = ORDER.map((group) => ({ group, items: rows.filter((row) => groupOf(row) === group) })).filter(
    (one) => one.items.length > 0,
  );
  const forMe = waiting.filter((row) => row.for === me).length;
  const badge = only === null ? `${forMe} waits for you` : `${waiting.length} waits for ${first(only)}`;
  return (
    <RailSection
      icon={BellAlertIcon}
      iconColor={forMe > 0 ? "warning" : "secondary"}
      title="Needs someone"
      subtitle={`${waiting.length} waiting${waiting.length > 1 ? ", newest first" : ""}`}
      badge={<Badge label={badge} variant={forMe > 0 || only !== null ? "warning" : "neutral"} />}
      hasStickyHeader={hasStickyHeader}
    >
      {groups.length === 0 ? (
        <EmptyState
          title="All clear"
          description="Nothing is waiting on anyone for this view."
          icon={<Icon icon={CheckCircleIcon} size="lg" color="success" />}
          isCompact
        />
      ) : (
        groups.map(({ group, items }) => (
          <List key={group} density="compact" hasDividers>
            {items.map((row) => (
              <ListItem
                key={row.link}
                label={row.title}
                description={row.text}
                onClick={() => go(row.link)}
                startContent={
                  <StatusDot variant={group === "settled" ? "success" : "warning"} label={token(group).label} isPulsing={group === "you"} />
                }
                endContent={
                  <VStack gap={1} hAlign="end">
                    <Token size="sm" color={token(group).color} label={token(group).label} />
                    <Text type="supporting" color="secondary">{`${ago(clock.now(), row.since)} ago`}</Text>
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

/** The manager's own counts. They explain the number, they are not it. */
export function WhereLost({ view, hasStickyHeader = false }: { readonly view: ManagerOverview; readonly hasStickyHeader?: boolean }) {
  const go = useGo();
  const { steps } = view.lost;
  const changes = view.lostWhy.filter((one) => one.change !== null).length;
  return (
    <RailSection
      icon={FunnelIcon}
      iconColor="secondary"
      title="Where it is lost"
      subtitle="The newest week, and what Juno would change"
      badge={<Badge label={`${changes} to try`} variant="neutral" />}
      hasStickyHeader={hasStickyHeader}
    >
      <List density="compact" hasDividers>
        {steps.map((step, index) => {
          const why = view.lostWhy[index];
          const change = why?.change ?? null;
          const about = why?.because.map((one) => `${one.n} ${one.what}`).join(", ") ?? "";
          return (
            <ListItem
              key={step.name}
              label={`${step.in} ${step.name}`}
              onClick={() => go(index === 0 ? `/m/${view.head.id}/intake` : `/m/${view.head.id}`)}
              description={
                <VStack gap={1}>
                  <Text type="supporting" color="secondary">
                    {about === "" ? "What counts" : about}
                  </Text>
                  {change === null ? null : (
                    <HStack>
                      <Token size="sm" color="blue" label={change} />
                    </HStack>
                  )}
                </VStack>
              }
            />
          );
        })}
      </List>
    </RailSection>
  );
}

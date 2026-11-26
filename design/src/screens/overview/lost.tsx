import { Badge } from "@astryxdesign/core/Badge";
import { List, ListItem } from "@astryxdesign/core/List";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { Text } from "@astryxdesign/core/Text";
import { Token } from "@astryxdesign/core/Token";
import { HStack, VStack } from "@astryxdesign/core/Layout";
import { BellAlertIcon, FunnelIcon } from "@heroicons/react/24/outline";
import { go } from "../../shell";
import type { Lost } from "./measures";
import { RailSection } from "./rail";

/** Sales has one thing that waits. */
export function NeedsBo({ hasStickyHeader = false }: { hasStickyHeader?: boolean }) {
  return (
    <RailSection icon={BellAlertIcon} iconColor="warning" title="Needs someone" subtitle="1 waiting" badge={<Badge label="1 waits for Bo" variant="warning" />} hasStickyHeader={hasStickyHeader}>
      <List density="compact" hasDividers>
        <ListItem label="Harbor Foods opened a site in Ghent" description="Write to its head of operations?" onClick={() => go("m-sales-intake-i1")}
          startContent={<StatusDot variant="warning" label="Waits for Bo" />}
          endContent={<VStack gap={1} hAlign="end"><Token size="sm" color="yellow" label="Waits for Bo" /><Text type="supporting" color="secondary">1 h ago</Text></VStack>} />
      </List>
    </RailSection>
  );
}

/** The manager’s own counts. They explain the number, they are not it. */
export function WhereLost({ rows, hasStickyHeader = false }: { rows: readonly Lost[]; hasStickyHeader?: boolean }) {
  const changes = rows.filter((r) => r.change).length;
  return (
    <RailSection icon={FunnelIcon} iconColor="secondary" title="Where it is lost" subtitle="The newest week, and what Juno would change" badge={<Badge label={`${changes} to try`} variant="neutral" />} hasStickyHeader={hasStickyHeader}>
      <List density="compact" hasDividers>
        {rows.map((r) => (
          <ListItem key={r.id} label={r.label} onClick={() => go(r.id === "came" && location.hash.startsWith("#m-sales") ? "m-sales-intake" : "soon-Where it is lost")}
            description={<VStack gap={1}><Text type="supporting" color="secondary">{r.about}</Text>{r.change && <HStack><Token size="sm" color="blue" label={r.change} /></HStack>}</VStack>} />
        ))}
      </List>
    </RailSection>
  );
}

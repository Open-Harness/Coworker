import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Grid } from "@astryxdesign/core/Grid";
import { VStack } from "@astryxdesign/core/Layout";
import { List, ListItem } from "@astryxdesign/core/List";
import { Text } from "@astryxdesign/core/Text";
import { Timestamp } from "@astryxdesign/core/Timestamp";
import { links, useDirectory } from "~/modules/app/service.ts";
import { Page, PageSection } from "~/modules/ui/service.ts";
import { adminLinks } from "./links.ts";
import { sessionRows } from "./sessions.ts";

const RECENT = 8;

const Figure = ({ label, value }: { readonly label: string; readonly value: number }) => (
  <Card padding={4}>
    <VStack gap={1}>
      <Text type="supporting" color="secondary">
        {label}
      </Text>
      <Text type="display-3" hasTabularNumbers>
        {value.toLocaleString()}
      </Text>
    </VStack>
  </Card>
);

/** What there is and what happened last. */
export function OverviewScreen() {
  const { agents, workspaces, people, models } = useDirectory();
  const sessions = sessionRows(workspaces);
  return (
    <Page title="Overview" width="wide" endContent={<Button label="New agent" variant="primary" href={adminLinks.create} />}>
      <Grid columns={{ minWidth: 160 }} gap={4}>
        <Figure label="Agents" value={agents.length} />
        <Figure label="Deployed" value={agents.filter(({ deployment }) => deployment !== undefined).length} />
        <Figure label="Sessions" value={sessions.length} />
        <Figure label="Answering now" value={sessions.filter(({ status }) => status === "working").length} />
        <Figure label="People online" value={people.length} />
        <Figure label="Models" value={models.length} />
      </Grid>
      <PageSection title="Latest sessions">
        {sessions.length === 0 ? (
          <EmptyState title="No sessions yet" headingLevel={3} isCompact />
        ) : (
          <List hasDividers edge="flush">
            {sessions.slice(0, RECENT).map((row) => (
              <ListItem
                key={row.id}
                label={row.title}
                description={`${row.agent} · ${row.workspace} · ${row.createdBy}`}
                href={links.chat(row.workspaceId, row.chatId)}
                endContent={<Timestamp value={row.updatedAt / 1000} format="relative" />}
              />
            ))}
          </List>
        )}
      </PageSection>
    </Page>
  );
}

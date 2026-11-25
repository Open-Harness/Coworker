import { useCallback } from "react";
import { Badge } from "@astryxdesign/core/Badge";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { VStack } from "@astryxdesign/core/Layout";
import { MetadataList, MetadataListItem } from "@astryxdesign/core/MetadataList";
import { Text } from "@astryxdesign/core/Text";
import { useLoading } from "~/modules/team-core/service.ts";
import { PageSection } from "~/modules/ui/service.ts";
import type { BuildApi } from "../types.ts";
import { DataTable } from "./DataTable.tsx";
import { Fetch } from "./Fetch.tsx";
import { useSave } from "./use-save.ts";

/** A manager's addresses, how each arrives, and a test mail to the person looking, to show the address works. */
export function EmailSource({
  api,
  workspaceId,
  managerId,
  canTest,
}: {
  readonly api: BuildApi;
  readonly workspaceId: string;
  readonly managerId: string;
  readonly canTest: boolean;
}) {
  const email = useLoading(useCallback(() => api.email(workspaceId), [api, workspaceId]));
  const { state, run } = useSave();
  return (
    <Fetch loading={email} failedTitle="Email did not load">
      {({ ending, addresses }) => {
        const own = addresses.find((entry) => entry.managerId === managerId);
        return (
          <VStack gap={8}>
            <PageSection title="Addresses">
              <DataTable
                items={addresses}
                idOf={(entry) => entry.managerId}
                empty="No manager has an address yet"
                columns={[
                  { header: "Address", cell: (entry) => <Text weight="medium">{entry.address}</Text> },
                  { header: "Goes to", cell: (entry) => <Text color="secondary">{entry.name}</Text> },
                  { header: "How it arrives", cell: (entry) => <Text color="secondary">{entry.how}</Text> },
                  {
                    header: "Status",
                    width: 110,
                    cell: (entry) => <Badge variant={entry.status === "Live" ? "success" : "warning"} label={entry.status} />,
                  },
                ]}
              />
              <Text type="supporting">{`Every address ends in ${ending}. Your own domain is not available yet.`}</Text>
            </PageSection>
            <PageSection title="Send a test mail">
              <Card padding={4}>
                <VStack gap={3} hAlign="start">
                  <Text>The manager mails you from its own address, so you can see that it arrives and who it is from.</Text>
                  {state._tag === "failed" && <Banner status="error" title="The test mail was not sent" description={state.message} />}
                  {state._tag === "saved" && <Banner status="success" title="Test mail sent" description="Look for it in your inbox." />}
                  <Button
                    label="Send a test mail"
                    isDisabled={!canTest}
                    clickAction={async () => void (await run(() => api.testMail(workspaceId, managerId)))}
                  />
                  {!canTest && <Text type="supporting">Only Owners and Builders send a test mail.</Text>}
                </VStack>
              </Card>
            </PageSection>
            <PageSection title="How email works here">
              <Card padding={4}>
                <MetadataList label={{ position: "start", width: 160 }}>
                  <MetadataListItem label="Each task has an address">
                    {own === undefined ? "launch.acme+dt-14@…" : `${own.taskAddress}. Replies to it are follow-ups on that task.`}
                  </MetadataListItem>
                  <MetadataListItem label="A sender is verified when">
                    Their domain passes DKIM. Otherwise the address is only “added”.
                  </MetadataListItem>
                  <MetadataListItem label="Auto-replies and bounces">Recognised and ignored. They never become work.</MetadataListItem>
                  <MetadataListItem label="Replies go out">From the manager's address, so a reply finds its task again.</MetadataListItem>
                </MetadataList>
              </Card>
            </PageSection>
          </VStack>
        );
      }}
    </Fetch>
  );
}

import { useCallback, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { Badge } from "@astryxdesign/core/Badge";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Grid } from "@astryxdesign/core/Grid";
import { MetadataList, MetadataListItem } from "@astryxdesign/core/MetadataList";
import { VStack } from "@astryxdesign/core/Layout";
import { Heading, Text } from "@astryxdesign/core/Text";
import { TextArea } from "@astryxdesign/core/TextArea";
import { TextInput } from "@astryxdesign/core/TextInput";
import { teamLinks, useLoading } from "~/modules/team-core/service.ts";
import { Page } from "~/modules/ui/service.ts";
import type { BuildApi, TemplateData } from "../types.ts";
import { Fetch } from "./Fetch.tsx";
import { FormDialog } from "./FormDialog.tsx";
import { useBuildApi, useGeneral } from "./use-api.ts";
import { VIEW_LABEL } from "./words.ts";

/** Names a manager made from a template, and what it is for. It opens on its chat once it exists. */
function StartDialog({
  api,
  workspaceId,
  template,
  onClose,
}: {
  readonly api: BuildApi;
  readonly workspaceId: string;
  readonly template: TemplateData;
  readonly onClose: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [mission, setMission] = useState("");
  const [failure, setFailure] = useState<string>();
  const start = async () => {
    const made = await api.createManager(workspaceId, {
      name: name.trim(),
      template: template.id,
      ...(mission.trim() === "" ? {} : { mission: mission.trim() }),
    });
    if (made._tag === "Failed") return setFailure(made.message);
    router.history.push(teamLinks.chat(workspaceId, made.value));
    onClose();
  };
  return (
    <FormDialog
      onClose={onClose}
      title={`Start a manager from ${template.name}`}
      subtitle="Its lanes, fields and permissions are the template's. Change any of them after."
      failure={failure}
      submitLabel="Start manager"
      isReady={name.trim() !== ""}
      onSubmit={start}
    >
      <TextInput label="Name" placeholder="Launch v2.3" value={name} onChange={setName} width="100%" isRequired />
      <TextArea
        label="What it is for"
        description="Its mission, in your words."
        rows={3}
        value={mission}
        onChange={setMission}
        width="100%"
        isOptional
      />
    </FormDialog>
  );
}

function TemplateCard({
  template,
  canStart,
  onStart,
}: {
  readonly template: TemplateData;
  readonly canStart: boolean;
  readonly onStart: () => void;
}) {
  return (
    <Card padding={5}>
      <VStack gap={3} hAlign="start">
        <Heading level={3}>{template.name}</Heading>
        <Badge label={`Opens on ${VIEW_LABEL[template.opensOn]}`} />
        <Text color="secondary">{template.about}</Text>
        <MetadataList label={{ position: "start", width: 64 }}>
          <MetadataListItem label="Lanes">{template.lanes.join(" · ")}</MetadataListItem>
          <MetadataListItem label="Fields">{template.fields.length === 0 ? "None" : template.fields.join(", ")}</MetadataListItem>
        </MetadataList>
        <Button
          label="Use template"
          aria-label={`Use the ${template.name} template`}
          variant="primary"
          isDisabled={!canStart}
          onClick={onStart}
        />
      </VStack>
    </Card>
  );
}

/** The gallery of starting points. A template is a manager's lanes, fields, first view and permission defaults. */
export function Templates({ workspaceId }: { readonly workspaceId: string }) {
  const api = useBuildApi();
  const general = useGeneral(api, workspaceId);
  const templates = useLoading(useCallback(() => api.templates(workspaceId), [api, workspaceId]));
  const [picked, setPicked] = useState<TemplateData>();
  const canStart = general.loaded?._tag === "Loaded" && general.loaded.value.role !== "member";
  return (
    <Page
      width="wide"
      title="Templates"
      description="A template is a starting manager. Everything can be changed after, by you or by the manager."
    >
      {general.loaded?._tag === "Loaded" && !canStart && (
        <Banner status="info" title="Only Owners and Builders start a manager. You can read the templates." />
      )}
      <Fetch loading={templates} failedTitle="Templates did not load">
        {(all) => (
          <Grid columns={{ minWidth: 320, max: 2 }} gap={4}>
            {all.map((template) => (
              <TemplateCard key={template.id} template={template} canStart={canStart} onStart={() => setPicked(template)} />
            ))}
          </Grid>
        )}
      </Fetch>
      {picked !== undefined && <StartDialog api={api} workspaceId={workspaceId} template={picked} onClose={() => setPicked(undefined)} />}
    </Page>
  );
}

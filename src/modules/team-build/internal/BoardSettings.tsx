import { useCallback } from "react";
import { Badge } from "@astryxdesign/core/Badge";
import { Banner } from "@astryxdesign/core/Banner";
import { HStack, VStack } from "@astryxdesign/core/Layout";
import { Selector } from "@astryxdesign/core/Selector";
import { Text } from "@astryxdesign/core/Text";
import { useLoading } from "~/modules/team-core/service.ts";
import { PageSection } from "~/modules/ui/service.ts";
import type { BuildApi, ViewName } from "../types.ts";
import { VIEWS } from "./decode-manager.ts";
import { Fetch } from "./Fetch.tsx";
import { FieldEditor } from "./FieldEditor.tsx";
import { LaneEditor } from "./LaneEditor.tsx";
import { usePress } from "./use-press.ts";
import { VIEW_LABEL } from "./words.ts";

/** The lanes and fields a board is made of, and the view it opens on. Each change is saved as it is made. */
export function BoardSettings({
  api,
  workspaceId,
  managerId,
  canEdit,
}: {
  readonly api: BuildApi;
  readonly workspaceId: string;
  readonly managerId: string;
  readonly canEdit: boolean;
}) {
  const manager = useLoading(useCallback(() => api.manager(workspaceId, managerId), [api, workspaceId, managerId]));
  const presser = usePress(api, workspaceId, managerId, manager.reload);
  const { state } = presser.saver;
  return (
    <Fetch loading={manager} failedTitle="The board did not load">
      {(info) => (
        <VStack gap={8}>
          <HStack gap={3} vAlign="center" wrap="wrap" minHeight={32}>
            {state._tag === "saving" && <Badge variant="info" label="Saving…" />}
            {state._tag === "saved" && <Badge variant="success" label="Saved" />}
            <Text color="secondary">Each change is saved as soon as you make it, and the manager sees it at once.</Text>
          </HStack>
          {state._tag === "failed" && <Banner status="error" title="Not saved" description={state.message} />}
          {presser.waiting !== undefined && (
            <Banner status="warning" title="Waiting for an Owner" description={`${presser.waiting}. It changes once an Owner allows it.`} />
          )}
          <LaneEditor lanes={info.lanes} presser={presser} canEdit={canEdit} />
          <FieldEditor fields={info.fields} presser={presser} canEdit={canEdit} />
          <PageSection title="Opens on">
            <Selector
              label="The view the board opens on"
              options={VIEWS.map((value) => ({ value, label: VIEW_LABEL[value] }))}
              value={info.defaultView}
              isDisabled={!canEdit}
              onChange={(value) => VIEWS.some((view) => view === value) && void presser.press("view.default", { view: value as ViewName })}
              width={240}
            />
            <Text type="supporting">Kanban, List, Console and Inbox are always there. This is only where the board opens.</Text>
          </PageSection>
        </VStack>
      )}
    </Fetch>
  );
}

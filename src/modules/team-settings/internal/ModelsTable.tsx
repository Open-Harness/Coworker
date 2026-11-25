import { useState } from "react";
import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Layout";
import { MoreMenu } from "@astryxdesign/core/MoreMenu";
import { Text } from "@astryxdesign/core/Text";
import { Timestamp } from "@astryxdesign/core/Timestamp";
import { useNarrow } from "~/modules/team-core/service.ts";
import type { Loaded } from "~/modules/team-core/types.ts";
import type { CheckData, ModelData } from "../types.ts";
import { ConfirmDialog } from "./ConfirmDialog.tsx";
import { EditEndpointDialog, ReplaceKeyDialog } from "./ConnectionDialogs.tsx";
import { DataTable } from "./DataTable.tsx";
import { seconds, SOURCE } from "./words.ts";

export interface ModelActions {
  readonly onRecheck: (model: ModelData) => Promise<void>;
  readonly onReplace: (model: ModelData, key: string) => Promise<Loaded<CheckData>>;
  readonly onEdit: (
    model: ModelData,
    edit: { readonly label: string; readonly baseUrl: string; readonly key?: string },
  ) => Promise<Loaded<CheckData>>;
  readonly onRemove: (model: ModelData) => Promise<Loaded<true>>;
}

const models = ({ models: names }: ModelData): string =>
  names.length === 0 ? "—" : names.length <= 2 ? names.join(", ") : `${names.slice(0, 2).join(", ")} and ${names.length - 2} more`;
const nameOf = (model: ModelData): string => (model.label === "" ? SOURCE[model.source].label : model.label);

function Status({ model }: { readonly model: ModelData }) {
  return (
    <VStack gap={1} hAlign="start">
      <Badge variant={model.error === undefined ? "success" : "error"} label={model.error === undefined ? "Works" : "Not working"} />
      <Text type="supporting">
        {model.error ?? (
          <>
            {"Checked "}
            <Timestamp value={seconds(model.checkedAt)} format="relative" />
          </>
        )}
      </Text>
    </VStack>
  );
}

/** What a person may do to one connection: test it, give it a new key or address, take it away. */
function Actions({
  model,
  on,
  ask,
}: {
  readonly model: ModelData;
  readonly on: ModelActions;
  readonly ask: (what: "key" | "edit" | "remove") => void;
}) {
  const items = [
    ...(model.source === "chatgpt" ? [] : [{ label: "Replace key", onClick: () => ask("key") }]),
    ...(model.source === "endpoint" ? [{ label: "Edit endpoint", onClick: () => ask("edit") }] : []),
    { label: "Remove", onClick: () => ask("remove") },
  ];
  return (
    <HStack gap={1} hAlign="end" vAlign="center">
      <Button
        label="Test again"
        size="sm"
        variant="ghost"
        clickAction={() => on.onRecheck(model)}
        aria-label={`Test ${nameOf(model)} again`}
      />
      <MoreMenu label={`More for ${nameOf(model)}`} size="sm" alignment="end" items={items} />
    </HStack>
  );
}

/** The workspace's model access, as a table, or as cards on a phone so every action stays reachable. */
export function ModelsTable({ connections, on }: { readonly connections: readonly ModelData[]; readonly on: ModelActions }) {
  const [asking, setAsking] = useState<{ readonly model: ModelData; readonly what: "key" | "edit" | "remove" }>();
  const isNarrow = useNarrow();
  const close = () => setAsking(undefined);
  const ask = (model: ModelData) => (what: "key" | "edit" | "remove") => setAsking({ model, what });
  const detail = (model: ModelData) => (model.source === "endpoint" ? model.baseUrl : SOURCE[model.source].how);
  return (
    <>
      {isNarrow ? (
        <VStack gap={3}>
          {connections.length === 0 && <EmptyState title="No model access yet" isCompact />}
          {connections.map((model) => (
            <Card key={model.id} padding={4}>
              <VStack gap={3}>
                <HStack gap={2} vAlign="start">
                  <StackItem size="fill">
                    <VStack gap={0}>
                      <Text weight="medium">{nameOf(model)}</Text>
                      <Text type="supporting" wordBreak="break-all">
                        {detail(model)}
                      </Text>
                    </VStack>
                  </StackItem>
                  <Status model={model} />
                </HStack>
                <Text color="secondary">{models(model)}</Text>
                <Actions model={model} on={on} ask={ask(model)} />
              </VStack>
            </Card>
          ))}
        </VStack>
      ) : (
        <DataTable
          items={connections}
          idOf={({ id }) => id}
          empty="No model access yet"
          columns={[
            {
              header: "Provider",
              cell: (model) => (
                <VStack gap={0}>
                  <Text weight="medium">{nameOf(model)}</Text>
                  <Text type="supporting">{detail(model)}</Text>
                </VStack>
              ),
            },
            { header: "Models", cell: (model) => <Text color="secondary">{models(model)}</Text> },
            { header: "Status", width: 220, cell: (model) => <Status model={model} /> },
            { header: "", width: 190, align: "end", cell: (model) => <Actions model={model} on={on} ask={ask(model)} /> },
          ]}
        />
      )}
      {asking?.what === "key" && (
        <ReplaceKeyDialog model={asking.model} onClose={close} onReplace={(key) => on.onReplace(asking.model, key)} />
      )}
      {asking?.what === "edit" && (
        <EditEndpointDialog model={asking.model} onClose={close} onEdit={(edit) => on.onEdit(asking.model, edit)} />
      )}
      <ConfirmDialog
        isOpen={asking?.what === "remove"}
        title={`Remove ${asking === undefined ? "" : nameOf(asking.model)}?`}
        description="Its key is deleted from the vault. Agents and managers that ran on it have to be given another model."
        actionLabel="Remove connection"
        onClose={close}
        onConfirm={() =>
          asking === undefined ? Promise.resolve<Loaded<true>>({ _tag: "Loaded", value: true }) : on.onRemove(asking.model)
        }
      />
    </>
  );
}

import { useState } from "react";
import { ArrowDownIcon, ArrowUpIcon } from "@heroicons/react/24/outline";
import { AlertDialog } from "@astryxdesign/core/AlertDialog";
import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { Icon } from "@astryxdesign/core/Icon";
import { IconButton } from "@astryxdesign/core/IconButton";
import { HStack } from "@astryxdesign/core/Layout";
import { NumberInput } from "@astryxdesign/core/NumberInput";
import { Switch } from "@astryxdesign/core/Switch";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { PageSection } from "~/modules/ui/service.ts";
import type { LaneInfo } from "../types.ts";
import { DataTable } from "./DataTable.tsx";
import { FormDialog } from "./FormDialog.tsx";
import type { Presser } from "./use-press.ts";

/** Makes or changes one lane. Deleting it asks again first: only an empty lane can go. */
function LaneDialog({
  lane,
  presser,
  onClose,
}: {
  readonly lane: LaneInfo | undefined;
  readonly presser: Presser;
  readonly onClose: () => void;
}) {
  const [name, setName] = useState(lane?.name ?? "");
  const [meaning, setMeaning] = useState(lane?.meaning ?? "");
  const [needsApproval, setNeedsApproval] = useState(lane?.needsApproval ?? false);
  const [limit, setLimit] = useState<number | undefined>(lane?.limit);
  const [isDeleting, setIsDeleting] = useState(false);
  const { state } = presser.saver;
  const failure = state._tag === "failed" ? state.message : undefined;
  const save = async () => {
    const input = { name: name.trim(), meaning, needsApproval };
    const outcome =
      lane === undefined
        ? await presser.press("lane.create", { ...input, ...(limit === undefined ? {} : { limit }) })
        : await presser.press("lane.update", { lane: lane.id, ...input, limit: limit ?? null });
    if (outcome !== "failed") onClose();
  };
  return (
    <>
      <FormDialog
        onClose={onClose}
        title={lane === undefined ? "Add a lane" : `Edit ${lane.name}`}
        subtitle="A lane is a step a task passes through."
        failure={failure}
        submitLabel={lane === undefined ? "Add lane" : "Save lane"}
        isReady={name.trim() !== ""}
        onSubmit={save}
      >
        <TextInput label="Name" value={name} onChange={setName} width="100%" isRequired />
        <TextInput label="What it means" value={meaning} onChange={setMeaning} width="100%" isOptional />
        <Switch label="A person approves a task leaving this lane" value={needsApproval} onChange={setNeedsApproval} />
        <NumberInput label="At most this many tasks" value={limit} onChange={setLimit} min={1} isIntegerOnly isOptional width={200} />
        {lane !== undefined && (
          <HStack>
            <Button label="Delete this lane" variant="destructive" onClick={() => setIsDeleting(true)} />
          </HStack>
        )}
      </FormDialog>
      {lane !== undefined && (
        <AlertDialog
          isOpen={isDeleting}
          onOpenChange={setIsDeleting}
          title={`Delete ${lane.name}?`}
          description="Only an empty lane can be deleted. The tasks in it have to move first."
          actionLabel="Delete lane"
          actionVariant="destructive"
          onAction={async () => {
            const outcome = await presser.press("lane.delete", { lane: lane.id });
            setIsDeleting(false);
            if (outcome !== "failed") onClose();
          }}
        />
      )}
    </>
  );
}

/** The lanes of the board, in order. */
export function LaneEditor({
  lanes,
  presser,
  canEdit,
}: {
  readonly lanes: readonly LaneInfo[];
  readonly presser: Presser;
  readonly canEdit: boolean;
}) {
  const [editing, setEditing] = useState<LaneInfo | "new">();
  const move = (index: number, by: -1 | 1) => {
    const order = lanes.map(({ id }) => id);
    const other = order[index + by];
    const own = order[index];
    if (other === undefined || own === undefined) return;
    order[index] = other;
    order[index + by] = own;
    void presser.press("lane.reorder", { order });
  };
  return (
    <PageSection title="Lanes">
      <DataTable
        items={lanes}
        idOf={({ id }) => id}
        empty="No lanes yet"
        columns={[
          { header: "Lane", width: 160, cell: ({ name }) => <Text weight="medium">{name}</Text> },
          { header: "What it means", cell: ({ meaning }) => <Text color="secondary">{meaning === "" ? "—" : meaning}</Text> },
          {
            header: "To leave",
            width: 110,
            cell: ({ needsApproval }) =>
              needsApproval ? <Badge variant="warning" label="Approval" /> : <Text color="secondary">Free</Text>,
          },
          { header: "Limit", width: 70, cell: ({ limit }) => <Text color="secondary">{limit ?? "—"}</Text> },
          {
            header: "",
            width: 180,
            align: "end",
            cell: (lane) => {
              const index = lanes.indexOf(lane);
              return (
                <HStack gap={1} hAlign="end">
                  <IconButton
                    label={`Move ${lane.name} up`}
                    variant="ghost"
                    size="sm"
                    icon={<Icon icon={ArrowUpIcon} size="sm" />}
                    isDisabled={!canEdit || index === 0}
                    onClick={() => move(index, -1)}
                  />
                  <IconButton
                    label={`Move ${lane.name} down`}
                    variant="ghost"
                    size="sm"
                    icon={<Icon icon={ArrowDownIcon} size="sm" />}
                    isDisabled={!canEdit || index === lanes.length - 1}
                    onClick={() => move(index, 1)}
                  />
                  <Button
                    label="Edit"
                    size="sm"
                    variant="ghost"
                    aria-label={`Edit ${lane.name}`}
                    isDisabled={!canEdit}
                    onClick={() => setEditing(lane)}
                  />
                </HStack>
              );
            },
          },
        ]}
      />
      {canEdit && (
        <HStack>
          <Button label="Add a lane" onClick={() => setEditing("new")} />
        </HStack>
      )}
      {editing !== undefined && (
        <LaneDialog lane={editing === "new" ? undefined : editing} presser={presser} onClose={() => setEditing(undefined)} />
      )}
    </PageSection>
  );
}

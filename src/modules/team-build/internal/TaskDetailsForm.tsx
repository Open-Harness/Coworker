import { useState } from "react";
import { Banner } from "@astryxdesign/core/Banner";
import { VStack } from "@astryxdesign/core/Layout";
import { NumberInput } from "@astryxdesign/core/NumberInput";
import { Selector } from "@astryxdesign/core/Selector";
import { TextInput } from "@astryxdesign/core/TextInput";
import type { BuildApi, FieldInfo, FieldValue, ManagerInfo, PersonName, TaskPage } from "../types.ts";
import { LeaveGuard } from "./LeaveGuard.tsx";
import { SaveBar } from "./SaveBar.tsx";
import { usePress } from "./use-press.ts";

const NONE = "none";

type Draft = { readonly lane: string; readonly owner: string; readonly values: Readonly<Record<string, FieldValue>> };
const draftOf = (task: TaskPage): Draft => ({ lane: task.lane, owner: task.owner ?? NONE, values: task.values });

function FieldInput({
  field,
  value,
  onChange,
}: {
  readonly field: FieldInfo;
  readonly value: FieldValue | undefined;
  readonly onChange: (value: FieldValue) => void;
}) {
  if (field.type === "select")
    return (
      <Selector
        label={field.label}
        options={[{ value: NONE, label: "Not set" }, ...field.options.map(({ value: option }) => ({ value: option, label: option }))]}
        value={typeof value === "string" ? value : NONE}
        onChange={(next) => onChange(next === undefined || next === NONE ? null : next)}
        width="100%"
      />
    );
  if (field.type === "number")
    return (
      <NumberInput
        label={field.label}
        value={typeof value === "number" ? value : undefined}
        onChange={(next) => onChange(next ?? null)}
        width="100%"
      />
    );
  return (
    <TextInput
      label={field.label}
      {...(field.type === "date" ? { placeholder: "2026-12-31" } : {})}
      value={typeof value === "string" ? value : ""}
      onChange={(next) => onChange(next === "" ? null : next)}
      width="100%"
    />
  );
}

/** Where a task is, who answers for it and what each field says. Saved together, each as the action a person's button is. */
export function TaskDetailsForm({
  api,
  workspaceId,
  managerId,
  task,
  manager,
  people,
  onSaved,
}: {
  readonly api: BuildApi;
  readonly workspaceId: string;
  readonly managerId: string;
  readonly task: TaskPage;
  readonly manager: ManagerInfo;
  readonly people: readonly PersonName[];
  readonly onSaved: () => void;
}) {
  const [draft, setDraft] = useState(draftOf(task));
  const presser = usePress(api, workspaceId, managerId, onSaved);
  const base = draftOf(task);
  const isDirty = JSON.stringify(draft) !== JSON.stringify(base);
  const save = async () => {
    const { press } = presser;
    if (draft.lane !== base.lane && (await press("task.move", { task: task.id, lane: draft.lane })) === "failed") return;
    if (
      draft.owner !== base.owner &&
      (await press("task.owner", { task: task.id, owner: draft.owner === NONE ? null : draft.owner })) === "failed"
    )
      return;
    const changed = Object.fromEntries(
      manager.fields
        .filter(({ key }) => (draft.values[key] ?? null) !== (base.values[key] ?? null))
        .map(({ key }) => [key, draft.values[key] ?? null]),
    );
    if (Object.keys(changed).length > 0) await press("task.values", { task: task.id, values: changed });
  };
  return (
    <VStack gap={4}>
      <LeaveGuard isDirty={isDirty} />
      <Selector
        label="Lane"
        options={manager.lanes.map(({ id, name }) => ({ value: id, label: name }))}
        value={draft.lane}
        onChange={(lane) => lane !== undefined && setDraft({ ...draft, lane })}
        width="100%"
      />
      <Selector
        label="Owner"
        options={[
          { value: NONE, label: "Nobody yet" },
          ...(task.owner === undefined || people.some(({ person }) => person === task.owner)
            ? []
            : [{ value: task.owner, label: task.owner.replace(/^email:/u, "") }]),
          ...people.map(({ person, name }) => ({ value: person, label: name })),
        ]}
        value={draft.owner}
        onChange={(owner) => owner !== undefined && setDraft({ ...draft, owner })}
        width="100%"
      />
      {manager.fields.map((field) => (
        <FieldInput
          key={field.key}
          field={field}
          value={draft.values[field.key]}
          onChange={(next) => setDraft({ ...draft, values: { ...draft.values, [field.key]: next } })}
        />
      ))}
      {presser.waiting !== undefined && (
        <Banner status="warning" title="Waiting for an Owner" description={`${presser.waiting}. It changes once an Owner allows it.`} />
      )}
      <SaveBar
        state={presser.saver.state}
        isDirty={isDirty}
        label="Save details"
        onSave={save}
        onDiscard={() => {
          setDraft(base);
          presser.saver.reset();
        }}
      />
    </VStack>
  );
}

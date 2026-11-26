import { useState } from "react";
import { AlertDialog } from "@astryxdesign/core/AlertDialog";
import { Button } from "@astryxdesign/core/Button";
import { HStack } from "@astryxdesign/core/Layout";
import { Selector } from "@astryxdesign/core/Selector";
import { Text } from "@astryxdesign/core/Text";
import { TextArea } from "@astryxdesign/core/TextArea";
import { TextInput } from "@astryxdesign/core/TextInput";
import { PageSection } from "~/modules/ui/service.ts";
import type { FieldInfo, FieldType } from "../types.ts";
import { DataTable } from "./DataTable.tsx";
import { FormDialog } from "./FormDialog.tsx";
import type { Presser } from "./use-press.ts";

const TYPES: readonly { readonly value: FieldType; readonly label: string }[] = [
  { value: "select", label: "A choice from a list" },
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "person", label: "Person" },
];
const typeLabel = (type: FieldType): string => TYPES.find(({ value }) => value === type)?.label ?? type;

/** Makes or changes one field. A field's kind is fixed once it exists. Deleting it takes its values with it. */
function FieldDialog({
  field,
  presser,
  onClose,
}: {
  readonly field: FieldInfo | undefined;
  readonly presser: Presser;
  readonly onClose: () => void;
}) {
  const [label, setLabel] = useState(field?.label ?? "");
  const [type, setType] = useState<FieldType>(field?.type ?? "text");
  const [options, setOptions] = useState(field?.options.map(({ value }) => value).join("\n") ?? "");
  const [isDeleting, setIsDeleting] = useState(false);
  const { state } = presser.saver;
  const isSelect = (field?.type ?? type) === "select";
  const optionsOf = () =>
    options
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line !== "")
      .map((value) => {
        const tone = field?.options.find((option) => option.value === value)?.tone;
        return { value, ...(tone === undefined ? {} : { tone }) };
      });
  const save = async () => {
    const outcome =
      field === undefined
        ? await presser.press("field.create", { label: label.trim(), type, ...(isSelect ? { options: optionsOf() } : {}) })
        : await presser.press("field.update", { field: field.key, label: label.trim(), ...(isSelect ? { options: optionsOf() } : {}) });
    if (outcome !== "failed") onClose();
  };
  return (
    <>
      <FormDialog
        onClose={onClose}
        title={field === undefined ? "Add a field" : `Edit ${field.label}`}
        subtitle="Every task can carry a value for each field."
        failure={state._tag === "failed" ? state.message : undefined}
        submitLabel={field === undefined ? "Add field" : "Save field"}
        isReady={label.trim() !== ""}
        onSubmit={save}
      >
        <TextInput label="Name" value={label} onChange={setLabel} width="100%" isRequired />
        <Selector
          label="Kind"
          options={[...TYPES]}
          value={type}
          isDisabled={field !== undefined}
          onChange={(value) => TYPES.some((one) => one.value === value) && setType(value as FieldType)}
          width="100%"
        />
        {isSelect && (
          <TextArea
            label="Choices"
            description="One on each line."
            rows={4}
            value={options}
            onChange={setOptions}
            hasSpellCheck={false}
            width="100%"
          />
        )}
        {field !== undefined && (
          <HStack>
            <Button label="Delete this field" variant="destructive" onClick={() => setIsDeleting(true)} />
          </HStack>
        )}
      </FormDialog>
      {field !== undefined && (
        <AlertDialog
          isOpen={isDeleting}
          onOpenChange={setIsDeleting}
          title={`Delete ${field.label}?`}
          description="Every task loses its value for this field. This cannot be undone."
          actionLabel="Delete field"
          actionVariant="destructive"
          onAction={async () => {
            const outcome = await presser.press("field.delete", { field: field.key });
            setIsDeleting(false);
            if (outcome !== "failed") onClose();
          }}
        />
      )}
    </>
  );
}

/** The fields every task can carry. */
export function FieldEditor({
  fields,
  presser,
  canEdit,
}: {
  readonly fields: readonly FieldInfo[];
  readonly presser: Presser;
  readonly canEdit: boolean;
}) {
  const [editing, setEditing] = useState<FieldInfo | "new">();
  return (
    <PageSection title="Fields">
      <DataTable
        items={fields}
        idOf={({ key }) => key}
        empty="No fields yet"
        columns={[
          { header: "Field", width: 180, cell: ({ label }) => <Text weight="medium">{label}</Text> },
          { header: "Kind", width: 180, cell: ({ type }) => <Text color="secondary">{typeLabel(type)}</Text> },
          {
            header: "Choices",
            cell: ({ options }) => (
              <Text color="secondary">{options.length === 0 ? "—" : options.map(({ value }) => value).join(", ")}</Text>
            ),
          },
          {
            header: "",
            width: 90,
            align: "end",
            cell: (field) => (
              <Button
                label="Edit"
                size="sm"
                variant="ghost"
                aria-label={`Edit ${field.label}`}
                isDisabled={!canEdit}
                onClick={() => setEditing(field)}
              />
            ),
          },
        ]}
      />
      {canEdit && (
        <HStack>
          <Button label="Add a field" onClick={() => setEditing("new")} />
        </HStack>
      )}
      {editing !== undefined && (
        <FieldDialog field={editing === "new" ? undefined : editing} presser={presser} onClose={() => setEditing(undefined)} />
      )}
    </PageSection>
  );
}

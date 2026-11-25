import { useState } from "react";
import { TextInput } from "@astryxdesign/core/TextInput";
import type { Loaded } from "~/modules/team-core/types.ts";
import type { CheckData, ModelData } from "../types.ts";
import { FormDialog } from "./FormDialog.tsx";
import { SOURCE } from "./words.ts";

type Saves = (key: string) => Promise<Loaded<CheckData>>;

const nameOf = (model: ModelData): string => (model.label === "" ? SOURCE[model.source].label : model.label);

/** A new key for a connection. The old one is not shown, and the new one is tested before it is kept. */
export function ReplaceKeyDialog({
  model,
  onClose,
  onReplace,
}: {
  readonly model: ModelData;
  readonly onClose: () => void;
  readonly onReplace: Saves;
}) {
  const [key, setKey] = useState("");
  const [failure, setFailure] = useState<string>();
  const save = async () => {
    const result = await onReplace(key);
    if (result._tag === "Failed") setFailure(result.message);
    else onClose();
  };
  return (
    <FormDialog
      isOpen
      onClose={onClose}
      title={`Replace the ${nameOf(model)} key`}
      subtitle="We test the new key with one call, then keep it in your vault. The old one is deleted."
      failure={failure}
      submitLabel="Replace and test"
      isReady={key !== ""}
      onSubmit={save}
    >
      <TextInput label="New key" type="password" autoComplete="off" value={key} onChange={setKey} width="100%" isRequired />
    </FormDialog>
  );
}

/** Changes an endpoint's name or address. A new address needs the key typed again, since the saved one was for the old. */
export function EditEndpointDialog({
  model,
  onClose,
  onEdit,
}: {
  readonly model: ModelData;
  readonly onClose: () => void;
  readonly onEdit: (edit: { readonly label: string; readonly baseUrl: string; readonly key?: string }) => Promise<Loaded<CheckData>>;
}) {
  const [label, setLabel] = useState(model.label);
  const [baseUrl, setBaseUrl] = useState(model.baseUrl);
  const [key, setKey] = useState("");
  const [failure, setFailure] = useState<string>();
  const isMoved = baseUrl.trim() !== model.baseUrl;
  const save = async () => {
    const result = await onEdit({ label: label.trim(), baseUrl: baseUrl.trim(), ...(key === "" ? {} : { key }) });
    if (result._tag === "Failed") setFailure(result.message);
    else onClose();
  };
  return (
    <FormDialog
      isOpen
      onClose={onClose}
      title={`Edit ${nameOf(model)}`}
      subtitle="We test the endpoint again when you save."
      failure={failure}
      submitLabel="Save and test"
      isReady={label.trim() !== "" && baseUrl.trim() !== "" && (!isMoved || key !== "")}
      onSubmit={save}
    >
      <TextInput label="Name" value={label} onChange={setLabel} width="100%" isRequired />
      <TextInput label="Base URL" value={baseUrl} onChange={setBaseUrl} width="100%" isRequired />
      <TextInput
        label="Key"
        type="password"
        autoComplete="off"
        value={key}
        onChange={setKey}
        description={isMoved ? "Type the key again: the one kept here was for the old address." : "Leave empty to keep the saved key."}
        width="100%"
        isRequired={isMoved}
        isOptional={!isMoved}
      />
    </FormDialog>
  );
}

import { useState } from "react";
import { TextInput } from "@astryxdesign/core/TextInput";
import type { Loaded } from "~/modules/team-core/types.ts";
import { FormDialog } from "./FormDialog.tsx";

/** Puts a secret in the vault, or replaces one of the same name. It is never shown again. */
export function SecretDialog({
  isOpen,
  onClose,
  onSave,
}: {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onSave: (name: string, value: string) => Promise<Loaded<true>>;
}) {
  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const [failure, setFailure] = useState<string>();
  const close = () => {
    setName("");
    setValue("");
    setFailure(undefined);
    onClose();
  };
  const save = async () => {
    const result = await onSave(name.trim(), value);
    if (result._tag === "Loaded") close();
    else setFailure(result.message);
  };
  return (
    <FormDialog
      isOpen={isOpen}
      onClose={close}
      title="Add a secret"
      subtitle="A setup script names it after vault:, as in vault:npm. Adding a name again replaces its value."
      failure={failure}
      submitLabel="Add to the vault"
      isReady={/^[A-Za-z0-9_.-]{1,80}$/u.test(name.trim()) && value !== ""}
      onSubmit={save}
    >
      <TextInput label="Name" placeholder="npm" value={name} onChange={setName} width="100%" isRequired />
      <TextInput label="Value" type="password" autoComplete="off" value={value} onChange={setValue} width="100%" isRequired />
    </FormDialog>
  );
}

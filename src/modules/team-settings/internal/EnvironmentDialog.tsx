import { useState } from "react";
import { Selector } from "@astryxdesign/core/Selector";
import { TextArea } from "@astryxdesign/core/TextArea";
import { TextInput } from "@astryxdesign/core/TextInput";
import { SIZES } from "~/modules/sandboxes/types.ts";
import type { Loaded } from "~/modules/team-core/types.ts";
import type { EnvironmentData, SaveEnvironment } from "../types.ts";
import { FormDialog } from "./FormDialog.tsx";

/** Makes or changes an environment. A new setup or size is a new version, and its setup runs once more. */
export function EnvironmentDialog({
  environment,
  onClose,
  onSave,
  onAssign,
  agents,
}: {
  readonly environment: EnvironmentData | undefined;
  readonly onClose: () => void;
  readonly onSave: (input: SaveEnvironment) => Promise<Loaded<true>>;
  readonly onAssign: (agent: string, environmentId: string) => Promise<boolean>;
  /** The agents the workspace has, and the plain Worker. */
  readonly agents: readonly string[];
}) {
  const [name, setName] = useState(environment?.name ?? "");
  const [setup, setSetup] = useState(environment?.setup ?? "");
  const [size, setSize] = useState(environment?.size ?? "2 vCPU · 4 GB");
  const [agent, setAgent] = useState("");
  const [failure, setFailure] = useState<string>();
  const save = async () => {
    const result = await onSave({ name: name.trim(), setup, size, ...(environment === undefined ? {} : { id: environment.id }) });
    if (result._tag === "Failed") return setFailure(result.message);
    const isAssigned = environment === undefined || agent === "" || (await onAssign(agent, environment.id));
    if (isAssigned) onClose();
  };
  return (
    <FormDialog
      isOpen
      width={600}
      onClose={onClose}
      title={environment === undefined ? "New environment" : `Edit ${environment.name}`}
      subtitle="Changing the setup or the size makes a new version."
      failure={failure}
      submitLabel="Save"
      isReady={name.trim() !== ""}
      onSubmit={save}
    >
      <TextInput label="Name" value={name} onChange={setName} width="100%" isRequired />
      <Selector label="Size" options={[...SIZES]} value={size} onChange={(value) => setSize(value ?? size)} width="100%" />
      <TextArea
        label="Setup script"
        description="Shell lines, run once per version."
        rows={8}
        value={setup}
        onChange={setSetup}
        hasSpellCheck={false}
        width="100%"
      />
      {environment !== undefined && (
        <Selector
          label="Agent to run here"
          description="It leaves the environment it is in now. For a saved agent this is a new version."
          options={[
            { value: "", label: "No change" },
            ...agents.filter((name) => !environment.usedBy.includes(name)).map((name) => ({ value: name, label: name })),
          ]}
          value={agent}
          onChange={setAgent}
          width="100%"
          isOptional
        />
      )}
    </FormDialog>
  );
}

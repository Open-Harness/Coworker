import { useState } from "react";
import { Selector } from "@astryxdesign/core/Selector";
import { TextInput } from "@astryxdesign/core/TextInput";
import type { Loaded } from "~/modules/team-core/types.ts";
import type { NewModel } from "../types.ts";
import { FormDialog } from "./FormDialog.tsx";

type Source = NewModel["source"];
const SOURCES: readonly { readonly value: Source; readonly label: string }[] = [
  { value: "anthropic", label: "Anthropic key" },
  { value: "openai", label: "OpenAI key" },
  { value: "google", label: "Google key" },
  { value: "opencode", label: "OpenCode key" },
  { value: "endpoint", label: "Your own endpoint" },
];
const isSource = (value: string | null): value is Source => SOURCES.some((source) => source.value === value);

interface Props {
  readonly isOpen: boolean;
  /** What to start on. */
  readonly initial?: Source;
  readonly onClose: () => void;
  readonly onAdd: (input: NewModel) => Promise<Loaded<true>>;
}

/** Adds a provider key or an endpoint. The server makes a test call before keeping it. */
export function AddModelDialog({ isOpen, initial = "anthropic", onClose, onAdd }: Props) {
  const [source, setSource] = useState<Source>(initial);
  const [label, setLabel] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [key, setKey] = useState("");
  const [failure, setFailure] = useState<string>();
  const isEndpoint = source === "endpoint";
  const close = () => {
    setKey("");
    setFailure(undefined);
    onClose();
  };
  const add = async () => {
    const name = label.trim();
    const input: NewModel = isEndpoint
      ? { source, label: name, baseUrl: baseUrl.trim(), ...(key === "" ? {} : { key }) }
      : { source, key, ...(name === "" ? {} : { label: name }) };
    const result = await onAdd(input);
    if (result._tag === "Loaded") close();
    else setFailure(result.message);
  };
  return (
    <FormDialog
      isOpen={isOpen}
      onClose={close}
      title="Add model access"
      subtitle="We make one test call with it and keep it in your vault."
      failure={failure}
      submitLabel="Add and test"
      isReady={isEndpoint ? label.trim() !== "" && baseUrl.trim() !== "" : key !== ""}
      onSubmit={add}
    >
      <Selector label="What" width="100%" options={[...SOURCES]} value={source} onChange={(value) => isSource(value) && setSource(value)} />
      <TextInput
        label="Name"
        value={label}
        onChange={setLabel}
        width="100%"
        {...(isEndpoint ? { isRequired: true } : { isOptional: true })}
      />
      {isEndpoint && (
        <TextInput
          label="Address"
          type="url"
          placeholder="https://models.acme.com/v1"
          value={baseUrl}
          onChange={setBaseUrl}
          width="100%"
          isRequired
        />
      )}
      <TextInput
        label="Key"
        type="password"
        autoComplete="off"
        value={key}
        onChange={setKey}
        width="100%"
        {...(isEndpoint ? { isOptional: true } : { isRequired: true })}
      />
    </FormDialog>
  );
}

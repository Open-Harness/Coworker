import { useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { CodeBlock } from "@astryxdesign/core/CodeBlock";
import { HStack, VStack } from "@astryxdesign/core/Layout";
import { TextArea } from "@astryxdesign/core/TextArea";
import type { AgentConfig } from "~/modules/agent-config/types.ts";
import { parseConfig, printConfig } from "./yaml.ts";

interface EditorProps {
  readonly config: AgentConfig;
  readonly onDone: (config?: AgentConfig) => void;
}

function TextEditor({ config, onDone }: EditorProps) {
  const [text, setText] = useState(() => printConfig(config));
  const parsed = parseConfig(text);
  return (
    <VStack gap={3}>
      <TextArea
        label="YAML"
        isLabelHidden
        rows={18}
        hasSpellCheck={false}
        hasAutoFocus
        value={text}
        onChange={setText}
        width="100%"
        {...(parsed.ok ? {} : { status: { type: "error" as const, message: parsed.message } })}
      />
      <HStack gap={2} hAlign="end">
        <Button label="Cancel" variant="ghost" onClick={() => onDone()} />
        <Button label="Apply" isDisabled={!parsed.ok} onClick={() => parsed.ok && onDone(parsed.value)} />
      </HStack>
    </VStack>
  );
}

/** A config as YAML, to read, copy, or paste over. */
export function ConfigText({ config, onChange }: { readonly config: AgentConfig; readonly onChange?: (config: AgentConfig) => void }) {
  const [isEditing, setIsEditing] = useState(false);
  if (isEditing) {
    return (
      <TextEditor
        config={config}
        onDone={(changed) => {
          setIsEditing(false);
          if (changed !== undefined) onChange?.(changed);
        }}
      />
    );
  }
  return (
    <CodeBlock
      code={printConfig(config)}
      language="yaml"
      title="Agent config"
      hasLineNumbers
      isWrapped
      width="100%"
      {...(onChange === undefined
        ? {}
        : { endContent: <Button label="Edit" size="sm" variant="ghost" onClick={() => setIsEditing(true)} /> })}
    />
  );
}

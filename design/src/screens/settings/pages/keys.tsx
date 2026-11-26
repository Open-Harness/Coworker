// astryx-template: table-collapsible
import { useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Collapsible } from "@astryxdesign/core/Collapsible";
import { Divider } from "@astryxdesign/core/Divider";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Layout";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { pixel, proportional, Table, type TableColumn } from "@astryxdesign/core/Table";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Token } from "@astryxdesign/core/Token";
import { useToast } from "@astryxdesign/core/Toast";
import { Part } from "../../../part";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import { ModelPicker } from "../../../model-picker";
import type { ReactNode } from "react";
import { DEFAULT_MODEL, MODELS, PROVIDERS, SECRETS, THINKING, price, type Model, type Secret } from "../facts/models";

export const meta = { save: true };
type ModelRow = Model & Record<string, unknown>;
type SecretRow = Secret & Record<string, unknown>;

/** A page part whose content is a table: the words above it, the table the whole width. */
function Wide({ title, about, children }: { title: string; about: string; children: ReactNode }) {
  return <VStack gap={4}><VStack gap={1}><Heading level={3} accessibilityLevel={2}>{title}</Heading><Text type="supporting" color="secondary">{about}</Text></VStack>{children}</VStack>;
}

export default function Keys({ onDirty }: { onDirty: () => void }) {
  const showToast = useToast();
  const isNarrow = useMediaQuery("(max-width: 768px)");
  const [model, setModel] = useState<string>(MODELS.find((m) => m.id === DEFAULT_MODEL.model)!.name);
  const say = (body: string) => showToast({ body, uniqueID: body });

  const modelCols: TableColumn<ModelRow>[] = [
    { key: "name", header: "Model", width: proportional(1.4, { minWidth: 150 }), renderCell: (r) => <Text type="body" maxLines={1}>{r.name}</Text> },
    { key: "in", header: "Reads", width: pixel(72), renderCell: (r) => <Text type="body">{price(r.in)}</Text> },
    { key: "out", header: "Writes", width: pixel(72), renderCell: (r) => <Text type="body">{price(r.out)}</Text> },
    { key: "thinking", header: "Thinking", width: proportional(1, { minWidth: 90 }), renderCell: (r) => <Text type="supporting" color="secondary" maxLines={2}>{r.thinking.join(", ")}</Text> },
  ];
  const secretCols: TableColumn<SecretRow>[] = [
    { key: "name", header: "Name", width: proportional(1.4, { minWidth: 160 }), renderCell: (r) => <VStack gap={0}><Text type="body" maxLines={1}>{r.name}</Text><Text type="supporting" color="secondary" maxLines={1}>{isNarrow ? `${r.of}, ${r.by.join(", ")}` : `${r.of}, ${r.used}`}</Text></VStack> },
    { key: "by", header: "Used by", width: proportional(1.4, { minWidth: 200 }), renderCell: (r) => <HStack gap={1} wrap="wrap">{r.by.map((b) => <Token key={b} label={b} size="sm" />)}</HStack> },
    { key: "more", header: "", width: pixel(110), renderCell: (r) => <Button label="Replace" size="sm" variant="ghost" onClick={() => say(`Type the new value for ${r.name}. It is not shown again.`)} /> },
  ];
  const secretShown = isNarrow ? secretCols.filter((c) => c.key !== "by") : secretCols;

  return (
    <>
      <Wide title="Models" about="Each one the workspace has connected, whether its key works, and what it costs. Managers and agents choose from these.">
        {PROVIDERS.map((p) => (
          <Card key={p.id} padding={0}>
            <Collapsible defaultIsOpen chevronPosition="start" trigger={
              <HStack gap={3} vAlign="center" wrap="wrap" paddingBlock={2}>
                <StatusDot variant={p.works ? "success" : "error"} label={p.works ? "Works" : "Does not work"} />
                <Heading level={3} accessibilityLevel={3}>{p.name}</Heading>
                <Text type="supporting" color="secondary">{`${p.models.length} models, key ${p.key}, tried at ${p.checked}. Prices in dollars per million tokens.`}</Text>
              </HStack>}>
              <Divider />
              <Table<ModelRow> data={p.models.map((m) => ({ ...m }))} columns={isNarrow ? modelCols.filter((c) => c.key !== "thinking") : modelCols} idKey="id" density="balanced" dividers="rows" textOverflow="truncate" />
            </Collapsible>
          </Card>
        ))}
        <HStack><Button label="Connect another" size="sm" variant="secondary" onClick={() => say("Pick a provider, then give its key. The key is kept, not shown.")} /></HStack>
      </Wide>
      <Divider />
      <Part title="Default" about="What is used when a manager or an agent has not chosen. A template never names a model.">
        <ModelPicker inherit={false} value={model} onChange={(v) => { setModel(v); onDirty(); }} onThinking={onDirty} thinking={DEFAULT_MODEL.thinking}
          levelsOf={(n) => MODELS.find((m) => m.name === n)?.thinking ?? THINKING} />
      </Part>
      <Divider />
      <Wide title="Secrets" about="Held by name. A value is never shown, not to you and not to a manager: it is opened for one call, and the call is written down.">
        <Card padding={0}><Table<SecretRow> data={SECRETS.map((s) => ({ ...s }))} columns={secretShown} idKey="id" density="balanced" dividers="rows" textOverflow="truncate" /></Card>
        <StackItem><Text type="supporting" color="secondary">Only an Owner can replace one.</Text></StackItem>
      </Wide>
    </>
  );
}

// astryx-template: table-collapsible
import { useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Collapsible } from "@astryxdesign/core/Collapsible";
import { Divider } from "@astryxdesign/core/Divider";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Layout";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { pixel, proportional, Table, type TableColumn } from "@astryxdesign/core/Table";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Token } from "@astryxdesign/core/Token";
import { useToast } from "@astryxdesign/core/Toast";
import { Reading, useClock, useRead } from "~/modules/page/service.ts";
import type { KeysView } from "~/modules/views-workspace/types.ts";
import { useDoing } from "../doing.ts";
import { capital, dollars, when } from "../format.ts";
import { ModelPicker, nameOf, modelsOf, levelsOf } from "../model-picker.tsx";
import { Part, Wide } from "../part.tsx";
import type { Dirty } from "../types.ts";

type ModelRow = KeysView["models"][number]["models"][number] & Record<string, unknown>;
type SecretRow = KeysView["secrets"][number] & Record<string, unknown>;

function Keys({ view, zone, onDirty }: { readonly view: KeysView; readonly zone: string; readonly onDirty: Dirty }) {
  const [showToast, isNarrow, clock, doing] = [useToast(), useMediaQuery("(max-width: 768px)"), useClock(), useDoing()];
  const first = view.choice === null || view.choice === "inherit" ? undefined : view.choice;
  const [model, setModel] = useState<string>(first === undefined ? (modelsOf(view.models)[0]?.name ?? "") : nameOf(view.models, first));
  const [level, setLevel] = useState<string>(capital(first?.thinking ?? "medium"));
  const say = (body: string) => showToast({ body, uniqueID: body });
  const keep = (name: string, thinking: string) =>
    onDirty(() => {
      const one = modelsOf(view.models).find((m) => m.name === name);
      return doing("models.default", { connection: one?.connection ?? "", model: one?.model ?? "", thinking: thinking.toLowerCase() }, [
        "/settings/keys",
      ]);
    });

  const modelCols: TableColumn<ModelRow>[] = [
    {
      key: "name",
      header: "Model",
      width: proportional(1.4, { minWidth: 150 }),
      renderCell: (r) => (
        <Text type="body" maxLines={1}>
          {r.name}
        </Text>
      ),
    },
    {
      key: "in",
      header: "Reads",
      width: pixel(72),
      renderCell: (r) => <Text type="body">{r.price === undefined ? "" : dollars(r.price.input)}</Text>,
    },
    {
      key: "out",
      header: "Writes",
      width: pixel(72),
      renderCell: (r) => <Text type="body">{r.price === undefined ? "" : dollars(r.price.output)}</Text>,
    },
    {
      key: "thinking",
      header: "Thinking",
      width: proportional(1, { minWidth: 90 }),
      renderCell: (r) => (
        <Text type="supporting" color="secondary" maxLines={2}>
          {r.levels.map(capital).join(", ")}
        </Text>
      ),
    },
  ];
  const secretCols: TableColumn<SecretRow>[] = [
    {
      key: "name",
      header: "Name",
      width: proportional(1.4, { minWidth: 160 }),
      renderCell: (r) => (
        <VStack gap={0}>
          <Text type="body" maxLines={1}>
            {r.name}
          </Text>
          <Text type="supporting" color="secondary" maxLines={1}>
            {isNarrow ? `${r.of}, ${r.usedBy.join(", ")}` : `${r.of}, ${when(r.usedAt, zone, clock)}`}
          </Text>
        </VStack>
      ),
    },
    {
      key: "by",
      header: "Used by",
      width: proportional(1.4, { minWidth: 200 }),
      renderCell: (r) => (
        <HStack gap={1} wrap="wrap">
          {r.usedBy.map((b) => (
            <Token key={b} label={b} size="sm" />
          ))}
        </HStack>
      ),
    },
    {
      key: "more",
      header: "",
      width: pixel(110),
      renderCell: (r) => (
        <Button label="Replace" size="sm" variant="ghost" onClick={() => say(`Type the new value for ${r.name}. It is not shown again.`)} />
      ),
    },
  ];

  return (
    <>
      <Wide
        title="Models"
        about="Each one the workspace has connected, whether its key works, and what it costs. Managers and agents choose from these."
      >
        {view.models.map((p) => (
          <Card key={p.id} padding={0}>
            <Collapsible
              defaultIsOpen
              chevronPosition="start"
              trigger={
                <HStack gap={3} vAlign="center" wrap="wrap" paddingBlock={2}>
                  <StatusDot variant={p.works ? "success" : "error"} label={p.works ? "Works" : "Does not work"} />
                  <Heading level={3} accessibilityLevel={3}>
                    {p.label}
                  </Heading>
                  <Text
                    type="supporting"
                    color="secondary"
                  >{`${p.models.length} models, key ${p.source}, tried at ${clock.time(p.checked)}. Prices in dollars per million tokens.`}</Text>
                </HStack>
              }
            >
              <Divider />
              <Table<ModelRow>
                data={p.models.map((m) => ({ ...m }))}
                columns={isNarrow ? modelCols.filter((c) => c.key !== "thinking") : modelCols}
                idKey="model"
                density="balanced"
                dividers="rows"
                textOverflow="truncate"
              />
            </Collapsible>
          </Card>
        ))}
        <HStack>
          <Button
            label="Connect another"
            size="sm"
            variant="secondary"
            onClick={() => say("Pick a provider, then give its key. The key is kept, not shown.")}
          />
        </HStack>
      </Wide>
      <Divider />
      <Part title="Default" about="What is used when a manager or an agent has not chosen. A template never names a model.">
        <ModelPicker
          connections={view.models}
          inherit={false}
          value={model}
          thinking={level}
          onChange={(v) => {
            setModel(v);
            keep(v, levelsOf(view.models, v).includes(level) ? level : (levelsOf(view.models, v)[0] ?? level));
          }}
          onThinking={(l) => {
            setLevel(l);
            keep(model, l);
          }}
        />
      </Part>
      <Divider />
      <Wide
        title="Secrets"
        about="Held by name. A value is never shown, not to you and not to a manager: it is opened for one call, and the call is written down."
      >
        <Card padding={0}>
          <Table<SecretRow>
            data={view.secrets.map((s) => ({ ...s }))}
            columns={isNarrow ? secretCols.filter((c) => c.key !== "by") : secretCols}
            idKey="name"
            density="balanced"
            dividers="rows"
            textOverflow="truncate"
          />
        </Card>
        <StackItem>
          <Text type="supporting" color="secondary">
            Only an Owner can replace one.
          </Text>
        </StackItem>
      </Wide>
    </>
  );
}

export default function KeysPage({ onDirty }: { readonly onDirty: Dirty }) {
  const shell = useRead("/shell");
  const zone = shell._tag === "Ok" ? shell.value.workspace.zone : "UTC";
  return <Reading from="/settings/keys">{(view) => <Keys view={view} zone={zone} onDirty={onDirty} />}</Reading>;
}

import { useState } from "react";
import { Divider } from "@astryxdesign/core/Divider";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Layout";
import { MetadataList, MetadataListItem } from "@astryxdesign/core/MetadataList";
import { MultiSelector } from "@astryxdesign/core/MultiSelector";
import { Text } from "@astryxdesign/core/Text";
import { TextArea } from "@astryxdesign/core/TextArea";
import { Token } from "@astryxdesign/core/Token";
import type { PlaybookView } from "~/modules/views-manager/types.ts";
import { ModelPicker, valueOf } from "./model-picker.tsx";
import { Note, useNotes } from "./notes.tsx";
import { Reading } from "~/modules/page/service.ts";
import type { KeysView, SharedView } from "~/modules/views-workspace/types.ts";
import { Part } from "./part.tsx";
import { toolWords } from "./words.ts";

type Entry = PlaybookView["agents"][number];

function One({ a, shared, keys }: { a: Entry; shared: SharedView["agents"][number] | undefined; keys: KeysView }) {
  const { isDraft, change, view } = useNotes();
  const { agent } = a;
  const names = view.skills
    .filter((s) => s.left === null && (s.layer === "craft" || s.layer === "connector"))
    .map((s) => ({ value: s.name, label: s.name }));
  const nameOf = (id: string) => view.skills.find((s) => s.id === id)?.name ?? id;
  const [told, setTold] = useState(agent.told);
  const [model, setModel] = useState(valueOf(agent.model));
  const [skills, setSkills] = useState<string[]>(agent.skills.map(nameOf));
  const stand = view.evals.find((e) => e.eval.of === `agents/${agent.id}`);
  const measure = shared?.measure;
  const at = (n: number | null): string =>
    measure === undefined || n === null ? "" : measure.of === null ? `${Math.round(n * 100)}%` : `${n} of ${measure.of}`;
  const line = at(measure?.line ?? null);
  const thinking = agent.model === "inherit" ? "medium" : agent.model.thinking;
  return (
    <Part
      title={agent.name}
      about={agent.is}
      more={
        <HStack gap={1} paddingBlockStart={2} vAlign="center">
          {isDraft && a.shared !== null && <Token size="sm" color="gray" label={`${a.shared}’s, shared`} />}
          <Note at={agent.name} />
        </HStack>
      }
    >
      <MetadataList columns="single" label={{ position: "start", width: 120 }}>
        <MetadataListItem label="Good means">{measure?.counts ?? stand?.eval.good ?? ""}</MetadataListItem>
        <MetadataListItem label={isDraft ? "On past work" : "Now"}>
          {isDraft
            ? `${at(isDraft ? (measure?.first ?? null) : (measure?.now ?? null))}, the aim is ${line}`
            : `${at(measure?.now ?? null)}, the aim is ${line}. It began at ${at(measure?.first ?? null)}`}
        </MetadataListItem>
        <MetadataListItem label="May use">{toolWords(agent.tools)}</MetadataListItem>
      </MetadataList>
      <TextArea
        label="What it is told"
        rows={4}
        value={told}
        onChange={(v: string) => {
          setTold(v);
          change();
        }}
      />
      <MultiSelector
        triggerDisplay="labels"
        label="Skills"
        value={skills}
        onChange={(v: string[]) => {
          setSkills(v);
          change();
        }}
        options={names}
        description="On top of the harness, and its page of the playbook"
      />
      <ModelPicker
        value={model}
        onChange={(v) => {
          setModel(v);
          change();
        }}
        keys={keys}
        thinking={thinking}
        onThinking={change}
      />
    </Part>
  );
}

export function Agents() {
  const { view } = useNotes();
  return (
    <VStack gap={5}>
      <HStack>
        <StackItem size="fill">
          <Text type="supporting" color="secondary">
            Who does the steps. None of them is seen outside: it is Juno who writes.
          </Text>
        </StackItem>
      </HStack>
      <Reading from="/settings/shared" failed="We could not read the agents of the workspace">
        {(shared) => (
          <Reading from="/settings/keys" failed="We could not read the models">
            {(keys) =>
              view.agents.map((a, i) => (
                <VStack key={a.agent.id} gap={5}>
                  {i > 0 && <Divider />}
                  <One a={a} shared={shared.agents.find((x) => x.id === a.agent.id)} keys={keys} />
                </VStack>
              ))
            }
          </Reading>
        )}
      </Reading>
    </VStack>
  );
}

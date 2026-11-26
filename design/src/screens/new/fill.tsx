import { useState } from "react";
import { Field } from "@astryxdesign/core/Field";
import { FormLayout } from "@astryxdesign/core/FormLayout";
import { VStack } from "@astryxdesign/core/Layout";
import { NumberInput } from "@astryxdesign/core/NumberInput";
import { Selector } from "@astryxdesign/core/Selector";
import { Heading, Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { ModelPicker } from "../../model-picker";
import { AGENTS, FROM, OWNERS, REPOS } from "./data";

const NAMES: Readonly<Record<string, string>> = { "acme/web": "Web", "acme/api": "API", "acme/docs": "Docs site" };
const nameOf = (repo: string) => NAMES[repo] ?? repo;

/** The blanks of Work on a repo. Only the repo is a question: every other blank has an answer, and says where it came from. */
export function Fill({ repo, onRepo }: { repo: string; onRepo: (repo: string) => void }) {
  const [name, setName] = useState<string | null>(null);
  const [who, setWho] = useState("Chidi Okafor");
  const [most, setMost] = useState(20);
  const [models, setModels] = useState<Readonly<Record<string, string>>>({});
  return (
    <VStack gap={5}>
      <VStack gap={1}><Heading level={2}>Work on a repo</Heading><Text type="supporting" color="secondary">One question, the rest is answered. Change what is wrong. The manager gets a copy of its own: later changes to the template do not reach it.</Text></VStack>
      <FormLayout defaultOptionality="optional">
        <Selector label="Which repo" isRequired value={repo} onChange={(v) => onRepo(v ?? repo)} options={REPOS.map((r) => ({ value: r.value, label: r.label, description: r.description }))} description="Where Juno has the GitHub app. Read first, nothing is changed." />
        <TextInput label="Name" value={name ?? nameOf(repo)} onChange={(v: string) => setName(v)} description={FROM.name} />
        <Selector label="Who answers for it" value={who} onChange={(v) => setWho(v ?? who)} options={OWNERS.map((o) => ({ value: o, label: o }))} description={FROM.who} />
        <NumberInput label="Most it may spend on one piece of work, in dollars" value={most} onChange={(v: number) => setMost(v)} min={1} isIntegerOnly description={FROM.most} />
        <Field label="Models" isGroupLabel description={FROM.models}>
          <VStack gap={4}>
            {AGENTS.map((a) => <ModelPicker key={a} label={a} above="Claude Sonnet 5.5" aboveName="The workspace’s" value={models[a] ?? ""} onChange={(m) => setModels((x) => ({ ...x, [a]: m }))} />)}
          </VStack>
        </Field>
      </FormLayout>
    </VStack>
  );
}

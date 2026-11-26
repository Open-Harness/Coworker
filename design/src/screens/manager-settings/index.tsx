// astryx-template: settings
import { useState } from "react";
import { AlertDialog } from "@astryxdesign/core/AlertDialog";
import { Button } from "@astryxdesign/core/Button";
import { Divider } from "@astryxdesign/core/Divider";
import { HStack, Layout, LayoutContent, LayoutHeader, StackItem, VStack } from "@astryxdesign/core/Layout";
import { Selector } from "@astryxdesign/core/Selector";
import { Switch } from "@astryxdesign/core/Switch";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { useToast } from "@astryxdesign/core/Toast";
import { Part } from "../../part";
import { go } from "../../shell";
import { manager, PEOPLE, under } from "../../world";
import { ModelPicker, INHERIT } from "../../model-picker";
import { DEFAULT_MODEL, MODELS } from "../settings/facts/models";
import { PARTS } from "../settings/facts/money";

const ANSWERS = ["ama", "bo", "chidi"] as const;

/** A manager's own Settings tab. What it sets here is for this manager only; the workspace's own are in Settings. */
export default function ManagerSettings() {
  const m = manager("coding");
  const spend = PARTS.find((p) => p.id === m.id)!;
  const below = under(m.id);
  const showToast = useToast();
  const say = (body: string) => showToast({ body, uniqueID: body });
  const [dirty, setDirty] = useState(false);
  const [name, setName] = useState(m.name);
  const [answers, setAnswers] = useState<string>("ama");
  const [model, setModel] = useState<string>(INHERIT);
  const [part, setPart] = useState(String(spend.part));
  const [piece, setPiece] = useState(String(spend.piece));
  const [paused, setPaused] = useState(false);
  const [isRetiring, setRetiring] = useState(false);
  const d = MODELS.find((x) => x.id === DEFAULT_MODEL.model)!;
  const touch = () => setDirty(true);
  return (
    <Layout height="fill"
      header={<LayoutHeader hasDivider={false} padding={4}><HStack gap={2} vAlign="center" wrap="wrap"><StackItem size="fill"><Text type="supporting" color="secondary">Only for Coding. Its playbook, with the work it does, is on the Playbook tab.</Text></StackItem>
        <Button label="Save" variant="primary" isDisabled={!dirty} onClick={() => { setDirty(false); say("Saved"); }} /></HStack></LayoutHeader>}
      content={
        <LayoutContent role="main" padding={4}>
          <VStack gap={4}>
            <Part title="Who it is" about="The name people see, and the one person who answers for it. It asks them, first.">
              <TextInput label="Name" value={name} onChange={(v: string) => { setName(v); touch(); }} />
              <Selector label="Who answers for it" value={answers} options={ANSWERS.map((a) => ({ value: a, label: `${PEOPLE[a]!.name}, ${PEOPLE[a]!.role}` }))} onChange={(v) => { if (v) { setAnswers(v); touch(); } }} />
            </Part>
            <Divider />
            <Part title="Model" about="What its agents use when they have not chosen one of their own. Chosen from what the workspace connected.">
              <ModelPicker value={model} above={d.name} aboveName="The workspace’s" thinking={DEFAULT_MODEL.thinking} onChange={(v) => { setModel(v); touch(); }} onThinking={touch} />
            </Part>
            <Divider />
            <Part title="Limits" about="Out of the $100 a day for everyone. Docs and Releases, below it, have parts of their own.">
              <TextInput label="Most it may spend in a day, in dollars" description="Juno handed it this. Change it in About Juno, Spending, so the parts still add up." value={part} isReadOnly onChange={() => undefined} />
              <TextInput label="Most for one piece of work, in dollars" description="A piece of work stops here and asks." value={piece} onChange={(v: string) => { setPiece(v); touch(); }} />
            </Part>
            <Divider />
            <Part title="Pause" about="It takes nothing new on. What is under way finishes, and what waits for a person still waits.">
              <Switch label={paused ? "Coding is paused" : "Coding is working"} value={!paused} onChange={(on: boolean) => { setPaused(!on); say(on ? "Coding works again" : "Coding is paused. 4 threads finish what they are on."); }} />
            </Part>
            <Divider />
            <Part title="Save as a template" about="A copy of its playbook with blanks, for making more. It names no repo, no account and no model.">
              <HStack><Button label="Save as a template" variant="secondary" onClick={() => say("Saved as a template. It is in Settings, Templates.")} /></HStack>
            </Part>
            <Divider />
            <Part title="Retire" about={`Stops it for good. It has ${m.last7.open} open pieces of work and ${m.last7.threads} threads running.`}>
              <HStack><Button label="Retire Coding" variant="destructive" onClick={() => setRetiring(true)} /></HStack>
            </Part>
          </VStack>
          <AlertDialog isOpen={isRetiring} onOpenChange={setRetiring} title="Retire Coding?" actionLabel="Retire Coding"
            description={`${m.last7.threads} threads stop where they are. The ${m.last7.open} open pieces of work are not lost: the ${m.last7.waiting} that wait for a person go to your inbox, the rest are kept, read only. ${below.map((b) => b.name).join(" and ")}, below it, go up to Juno until you choose another. Its playbook, with every version, stays.`}
            onAction={() => { setRetiring(false); say("Coding is retired"); go("root"); }} />
        </LayoutContent>}
    />
  );
}

import { useState } from "react";
import { Divider } from "@astryxdesign/core/Divider";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Layout";
import { List, ListItem } from "@astryxdesign/core/List";
import { NumberInput } from "@astryxdesign/core/NumberInput";
import { Selector } from "@astryxdesign/core/Selector";
import { Text } from "@astryxdesign/core/Text";
import { TextArea } from "@astryxdesign/core/TextArea";
import { Token } from "@astryxdesign/core/Token";
import { Part } from "./part";

const MAY = [["Email", "Reply in threads it has", "Writing first to a stranger asks"], ["CRM", "Read all, change its own deals", "Offer sent asks"], ["Search", "Read the web", "$100 a month"], ["Calendar", "Book in Bo’s", "Only 09:00 to 17:00"]] as const;

export function Mandate({ onDirty }: { onDirty?: () => void }) {
  const [job, setJob] = useState("Take a lead from first contact to a call, and tell Bo early when one is worth it.");
  const [day, setDay] = useState(20); const [open, setOpen] = useState(25);
  return (
    <>
      <Part title="What it is for" about="Its part of the objective. Every thread it starts reads it first."><TextArea label="Job" isLabelHidden rows={3} value={job} onChange={(v: string) => { setJob(v); onDirty?.(); }} /></Part>
      <Divider />
      <Part title="How far it may go" about="Handed on by Juno, from what Ama gave it. A piece of work gets a part of this, never more.">
        <List density="balanced" hasDividers>{MAY.map(([name, may, limit]) => <ListItem key={name} label={name} description={may} endContent={<Text type="supporting" color="secondary">{limit}</Text>} />)}</List>
      </Part>
      <Divider />
      <Part title="Limits" about="When one is reached it stops taking on new work, says so once, and finishes what is open.">
        <NumberInput label="Most it may spend in a day, in dollars" value={day} onChange={(n: number) => { setDay(n); onDirty?.(); }} min={0} isIntegerOnly />
        <NumberInput label="Most pieces of work open at once" value={open} onChange={(n: number) => { setOpen(n); onDirty?.(); }} min={1} isIntegerOnly />
      </Part>
    </>
  );
}

const LET = [{ value: "asked", label: "Counts as asking" }, { value: "maybe", label: "Judged by kind" }, { value: "no", label: "Starts nothing" }];
const WHO: readonly (readonly [string, string, readonly (readonly [string, string])[]])[] = [
  ["Mail about buying", "To juno@acme.co-worker.tech, when it is really from who it says.", [["The team", "asked"], ["Strangers who write to it", "asked"], ["Bulk mail and bots", "no"]]],
  ["Slack #sales", "Heard in full, so that it knows what is going on.", [["The team, speaking to it", "asked"], ["The team, not speaking to it", "maybe"], ["Guests in the channel", "no"]]],
  ["A deal moves in the CRM", "Nobody is behind it, so it starts nothing. Open work is told either way.", [["Someone changes a deal", "no"]]],
];
function Let({ who, start, onDirty }: { who: string; start: string; onDirty: (() => void) | undefined }) {
  const [v, set] = useState(start);
  return <Selector label={who} value={v} onChange={(x) => { set(x); onDirty?.(); }} options={LET} />;
}
export function Asking({ onDirty }: { onDirty?: () => void }) {
  return <>{WHO.map(([name, about, rows], i) => <VStack key={name} gap={4}>{i > 0 && <Divider />}<Part title={name} about={about}>{rows.map(([who, start]) => <Let key={who} who={who} start={start} onDirty={onDirty} />)}</Part></VStack>)}</>;
}

export function Never({ onDirty }: { onDirty?: () => void }) {
  const [v, set] = useState("Give a price that is not on the site.\nSay a customer’s name to another customer.\nWrite to someone who said stop.\nWrite to a private address it found by itself.");
  return <Part title="Never" about="Lines it does not cross, whoever asks and whatever it finds."><TextArea label="Never" isLabelHidden rows={6} value={v} onChange={(x: string) => { set(x); onDirty?.(); }} /></Part>;
}

const VERSIONS = [["6", "Signs: not a single job advert", "Ama, from 3 corrections", "23 Nov", "2 open pieces were told"], ["5", "A lead that went quiet: ask to do", "Bo, suggested by Juno", "16 Nov", "None was affected"], ["4", "The team may ask in Slack #sales", "Ama", "9 Nov", "None was affected"], ["3", "Never write to a private address it found", "Bo, after one mail", "2 Nov", "1 open piece was stopped"], ["2", "Like our best customers: in a country we sell to", "Ama, from 4 corrections", "19 Oct", "None was affected"], ["1", "Set up, from the plan", "Juno, Ama said yes", "5 Oct", "The first"]] as const;
export function Versions() {
  return (
    <Part title="Versions" about="Every decision says which version it was made under. Going back is a new version.">
      <List density="balanced" hasDividers>
        {VERSIONS.map(([n, what, who, when, told]) => <ListItem key={n} label={what} description={`${who} · ${told}`} startContent={<Token size="sm" color="gray" label={n} />} endContent={<HStack><StackItem><Text type="supporting" color="secondary">{when}</Text></StackItem></HStack>} />)}
      </List>
    </Part>
  );
}

import { useState } from "react";
import { DateInput } from "@astryxdesign/core/DateInput";
import { Divider } from "@astryxdesign/core/Divider";
import { List, ListItem } from "@astryxdesign/core/List";
import { NumberInput } from "@astryxdesign/core/NumberInput";
import { Text } from "@astryxdesign/core/Text";
import { OBJECTIVES } from "../overview/measures";
import { useNotes } from "../playbook/notes";
import { Part } from "./part";

const O = OBJECTIVES["sales"]!;

/** What we want to get to. The words are the person’s; the numbers are how we would know. */
export function Goal({ onDirty }: { onDirty?: () => void }) {
  const { isDraft } = useNotes();
  const [target, setTarget] = useState(12);
  const [by, setBy] = useState("2026-12-31");
  return (
    <>
      <Part title="What you said" about={`${O.who}. Kept in your words.`}><Text type="body">{`“${O.said}”`}</Text></Part>
      <Divider />
      <Part title="How we would know" about="A good call took place, with a company that fits. Read in the CRM, where only Bo may set it.">
        <NumberInput label="Good calls a week" value={target} onChange={(n: number) => { setTarget(n); onDirty?.(); }} min={1} isIntegerOnly />
        <DateInput label="By" value={by as never} onChange={(d) => { setBy(String(d)); onDirty?.(); }} />
      </Part>
      <Divider />
      <Part title="What must not get worse" about="When one of these does, Sales stops taking on what it found, and asks Ama.">
        <List density="balanced" hasDividers>{O.measures.filter((m) => m.isGuard).map((m) => <ListItem key={m.id} label={m.name} description={<Text type="supporting" color="secondary">{`${m.counts}. ${m.read}`}</Text>} endContent={<Text type="supporting" color="secondary">{isDraft ? m.aim : `${m.value}. ${m.aim}`}</Text>} />)}</List>
      </Part>
    </>
  );
}

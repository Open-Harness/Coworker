import { useState } from "react";
import { Field } from "@astryxdesign/core/Field";
import { VStack } from "@astryxdesign/core/Layout";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { Text } from "@astryxdesign/core/Text";
import { TextArea } from "@astryxdesign/core/TextArea";
import { MODE, type Kind, type Mode } from "../../sales";
import { useNotes } from "./notes";
import { Part } from "../../part";

const DOES: Readonly<Record<Mode, string>> = { off: "It does not look at it.", watch: "It says what it would have done. Nothing starts.", ask: "It prepares it. A person says yes before anything goes out.", do: "It starts by itself." };
/** Two weeks of watching and asking first; what people ask for starts at once. */
const FIRST: Readonly<Record<string, Mode>> = { signal: "ask", like: "watch", quiet: "ask" };

/** When something is this kind of work, whether it may start by itself, and when it is done. */
export function KindRules({ k }: { k: Kind }) {
  const { isDraft, change } = useNotes();
  const [when, setWhen] = useState(k.when);
  const [done, setDone] = useState(k.done);
  const [mode, setMode] = useState<Mode>(isDraft ? FIRST[k.id] ?? k.alone : k.alone);
  const id = `mode-${k.id}`;
  return (
    <Part title={k.name} about={isDraft ? "When it is this, and whether it starts alone." : `${k.record}. ${k.may}`}>
      <TextArea label="It is this when" rows={2} value={when} onChange={(v: string) => { setWhen(v); change(); }} />
      {k.id === "asked" ? <VStack gap={1}><Text type="label">When nobody asked</Text><Text type="supporting" color="secondary">Somebody always did. It starts when someone who may ask does.</Text></VStack> : (
        <Field label="When nobody asked" inputID={id} labelID={`${id}-l`} isGroupLabel description={DOES[mode]}>
          <SegmentedControl label="When nobody asked" aria-labelledby={`${id}-l`} value={mode} onChange={(v) => { setMode(v as Mode); change(); }} layout="fill">
            {(Object.keys(MODE) as Mode[]).map((m) => <SegmentedControlItem key={m} value={m} label={MODE[m]} />)}
          </SegmentedControl>
        </Field>
      )}
      <TextArea label="Done when" rows={2} value={done} onChange={(v: string) => { setDone(v); change(); }} />
    </Part>
  );
}

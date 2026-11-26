import { useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Divider } from "@astryxdesign/core/Divider";
import { Field } from "@astryxdesign/core/Field";
import { HStack, VStack } from "@astryxdesign/core/Layout";
import { MetadataList, MetadataListItem } from "@astryxdesign/core/MetadataList";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { Text } from "@astryxdesign/core/Text";
import { useToast } from "@astryxdesign/core/Toast";
import { KINDS, MODE, type Kind, type Mode } from "../../sales";
import { Part } from "./part";

const DOES: Readonly<Record<Mode, string>> = { off: "It does not look at it.", watch: "It says what it would have done. Nothing starts.", ask: "It asks a person each time.", do: "It starts by itself." };

function One({ k, onDirty }: { k: Kind; onDirty: (() => void) | undefined }) {
  const showToast = useToast();
  const [mode, setMode] = useState<Mode>(k.alone);
  const id = `mode-${k.id}`;
  return (
    <Part title={k.name} about={k.when} more={<HStack paddingBlockStart={1}><Text type="supporting" weight="semibold">{k.record}</Text></HStack>}>
      {k.id === "asked" ? <Text type="body">Starts when someone who may ask does.</Text> : <Field label="When nobody asked" inputID={id} labelID={`${id}-l`} isGroupLabel description={DOES[mode]}>
        <SegmentedControl label="When nobody asked" aria-labelledby={`${id}-l`} value={mode} onChange={(v) => { setMode(v as Mode); onDirty?.(); showToast({ body: `${k.name}: ${MODE[v as Mode].toLowerCase()}. Version 7 starts when you save.`, uniqueID: id }); }} layout="fill">
          {(Object.keys(MODE) as Mode[]).map((m) => <SegmentedControlItem key={m} value={m} label={MODE[m]} />)}
        </SegmentedControl>
      </Field>}
      <MetadataList columns="single" label={{ position: "start", width: 88 }}>
        <MetadataListItem label="Steps">{k.steps}</MetadataListItem>
        <MetadataListItem label="Done when">{k.done}</MetadataListItem>
        <MetadataListItem label="Mandate">{k.may}</MetadataListItem>
      </MetadataList>
      {k.id === "signal" && <HStack gap={2} vAlign="center" wrap="wrap"><Text type="supporting" color="secondary">Juno suggests Do: no “no” in the last 14.</Text><Button label="See the 14" size="sm" variant="ghost" onClick={() => showToast({ body: "Opens Intake, filtered to them", uniqueID: "see" })} /></HStack>}
    </Part>
  );
}

export function Kinds({ onDirty }: { onDirty?: () => void }) {
  return <>{KINDS.map((k, i) => <VStack key={k.id} gap={4}>{i > 0 && <Divider />}<One k={k} onDirty={onDirty} /></VStack>)}</>;
}

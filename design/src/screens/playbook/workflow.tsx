import { Fragment, useState } from "react";
import { Grid } from "@astryxdesign/core/Grid";
import { Icon } from "@astryxdesign/core/Icon";
import { Card } from "@astryxdesign/core/Card";
import { FormLayout } from "@astryxdesign/core/FormLayout";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Layout";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import { MultiSelector } from "@astryxdesign/core/MultiSelector";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { SelectableCard } from "@astryxdesign/core/SelectableCard";
import { Selector } from "@astryxdesign/core/Selector";
import { Heading, Text } from "@astryxdesign/core/Text";
import { TextArea } from "@astryxdesign/core/TextArea";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Token } from "@astryxdesign/core/Token";
import { ChevronRightIcon } from "@heroicons/react/24/outline";
import { Divider } from "@astryxdesign/core/Divider";
import { KINDS } from "../../sales";
import { SKILLS, STEPS, type Step } from "./data";
import { KindRules } from "./kind";
import { Note, useNotes } from "./notes";

const opts = (xs: readonly string[]) => xs.map((x) => ({ value: x, label: x }));
const WHO = opts(["Researcher", "Writer", "Reader", "Sales", "Bo Larsen"]);
const NAMES = opts(SKILLS.filter((s) => !s.cut && s.layer !== "Playbook" && s.layer !== "Harness").map((s) => s.name));
const FROM: Readonly<Record<string, string>> = { asked: "Mail about buying", signal: "Look for signs", like: "Find companies like our best", quiet: "No answer for three days" };

function Edit({ s }: { s: Step }) {
  const { change } = useNotes();
  const [does, setDoes] = useState(s.does); const [by, setBy] = useState(s.by); const [skills, setSkills] = useState<string[]>([...s.skills]); const [leaves, setLeaves] = useState(s.leaves); const [not, setNot] = useState(s.not);
  return (
    <FormLayout>
      <TextArea label="What happens here" rows={2} value={does} onChange={(v: string) => { setDoes(v); change(); }} />
      <Selector label="Who" value={by} onChange={(v) => { setBy(v); change(); }} options={WHO} />
      <MultiSelector triggerDisplay="labels" label="Skills it uses here" value={skills} onChange={(v: string[]) => { setSkills(v); change(); }} options={NAMES} placeholder="None" />
      <TextInput label="Goes on when" value={leaves} onChange={(v: string) => { setLeaves(v); change(); }} description="Checked by someone else than who did it" />
      <TextInput label="If not" value={not} onChange={(v: string) => { setNot(v); change(); }} />
    </FormLayout>
  );
}

/** A kind of work as a path of steps. Between them the rules are fixed; inside one the agent is free. */
export function Workflow() {
  const { isDraft } = useNotes();
  const isNarrow = useMediaQuery("(max-width: 900px)");
  const [path, setPath] = useState("signal");
  const [at, setAt] = useState("write");
  const k = KINDS.find((x) => x.id === path)!;
  const here = k.path.map((id) => STEPS.find((s) => s.id === id)!);
  const s = here.find((x) => x.id === at) ?? here[0]!;
  return (
    <VStack gap={5}>
      <Text type="supporting" color="secondary">The steps each kind of work goes through, and what must be true before the next one begins. Choose a step to change it.</Text>
      <HStack gap={3} vAlign="center" wrap="wrap">
        {isNarrow ? <Selector label="Kind of work" isLabelHidden value={path} onChange={(v) => setPath(String(v))} options={KINDS.map((x) => ({ value: x.id, label: x.name }))} /> : <SegmentedControl label="Kind of work" value={path} onChange={(v) => setPath(String(v))} size="sm">{KINDS.map((x) => <SegmentedControlItem key={x.id} value={x.id} label={x.name} />)}</SegmentedControl>}
        <Text type="supporting" color="secondary">Begins with: {FROM[path]}</Text>
      </HStack>
      <Grid columns={isNarrow ? 1 : here.length} gap={3}>
        {here.map((x, i) => (
          <Fragment key={x.id}>
            <SelectableCard label={x.name} isSelected={x.id === s.id} onChange={() => setAt(x.id)} padding={3}>
              <VStack gap={1}>
                <HStack gap={1} vAlign="center"><StackItem size="fill"><Text type="supporting" color="secondary">{String(i + 1)}</Text></StackItem>{i < here.length - 1 && !isNarrow && <Icon icon={ChevronRightIcon} size="sm" color="secondary" />}</HStack>
                <Text type="label">{x.name}</Text>
                <Text type="supporting" color="secondary">{x.by}</Text>
                <Text type="supporting" color="secondary">{isDraft ? x.first : x.now} of 100 go on the first time</Text>
                {isDraft && x.first < x.line && <HStack><Token size="sm" color="red" label={`Aim ${x.line}`} /></HStack>}
              </VStack>
            </SelectableCard>
          </Fragment>
        ))}
      </Grid>
      <Card padding={4}>
        <VStack gap={4}>
          <HStack gap={2} vAlign="center"><StackItem size="fill"><HStack gap={2} vAlign="center"><Heading level={3} accessibilityLevel={2}>{s.name}</Heading>{isDraft && <Token size="sm" color={s.because === "My idea" ? "blue" : "gray"} label={s.because} />}</HStack></StackItem><Note at={s.name} /></HStack>
          <Edit key={s.id} s={s} />
        </VStack>
      </Card>
      <Divider />
      <KindRules key={path} k={k} />
    </VStack>
  );
}

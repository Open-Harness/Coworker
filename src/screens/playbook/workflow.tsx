import { useState } from "react";
import { Card } from "@astryxdesign/core/Card";
import { Divider } from "@astryxdesign/core/Divider";
import { FormLayout } from "@astryxdesign/core/FormLayout";
import { Grid } from "@astryxdesign/core/Grid";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import { Icon } from "@astryxdesign/core/Icon";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Layout";
import { MultiSelector } from "@astryxdesign/core/MultiSelector";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { SelectableCard } from "@astryxdesign/core/SelectableCard";
import { Selector } from "@astryxdesign/core/Selector";
import { Heading, Text } from "@astryxdesign/core/Text";
import { TextArea } from "@astryxdesign/core/TextArea";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Token } from "@astryxdesign/core/Token";
import { ChevronRightIcon } from "@heroicons/react/24/outline";
import type { Kind, Step } from "~/modules/playbook/types.ts";
import { KindRules } from "./kind.tsx";
import { Note, useNotes, type Ctx } from "./notes.tsx";
import { upper } from "./words.ts";

const opts = (xs: readonly string[]) => xs.map((x) => ({ value: x, label: x }));

function by(s: Step, { view, person }: Ctx): string {
  if ("agent" in s.by) {
    const id = s.by.agent;
    return view.playbook.agents.find((a) => a.id === id)?.name ?? "";
  }
  return "person" in s.by ? person(s.by.person) : view.playbook.name;
}
/** What happens when a step's check is not met, in a line. */
function otherwise(s: Step, step: (id: string) => string, person: (id: string) => string): string {
  const o = s.otherwise;
  if ("back" in o) return `Back to ${step(o.back)}${"ask" in o.then ? `, once. Then ask ${person(o.then.ask)}` : ""}`;
  if ("ask" in o) return `Ask ${person(o.ask)}`;
  return o.drop === "Say why" ? "Drop it, and say why" : `Drop it. ${o.drop}`;
}

function Edit({ s, k }: { s: Step; k: Kind }) {
  const notes = useNotes();
  const { view, change, person } = notes;
  const names = view.skills.filter((x) => x.left === null && (x.layer === "craft" || x.layer === "connector")).map((x) => x.name);
  const nameOf = (id: string) => view.skills.find((x) => x.id === id)?.name ?? id;
  const [does, setDoes] = useState(s.does);
  const [who, setWho] = useState(by(s, notes));
  const [skills, setSkills] = useState<string[]>(s.skills.map(nameOf));
  const [leaves, setLeaves] = useState(s.leaves.map((c) => c.says).join(". "));
  const [not, setNot] = useState(otherwise(s, (id) => k.steps.find((x) => x.id === id)?.name ?? id, person));
  const people = [...view.playbook.agents.map((a) => a.name), view.playbook.name, who];
  return (
    <FormLayout>
      <TextArea
        label="What happens here"
        rows={2}
        value={does}
        onChange={(v: string) => {
          setDoes(v);
          change();
        }}
      />
      <Selector
        label="Who"
        value={who}
        onChange={(v) => {
          setWho(String(v));
          change();
        }}
        options={opts([...new Set(people)])}
      />
      <MultiSelector
        triggerDisplay="labels"
        label="Skills it uses here"
        value={skills}
        onChange={(v: string[]) => {
          setSkills(v);
          change();
        }}
        options={opts(names)}
        placeholder="None"
      />
      <TextInput
        label="Goes on when"
        value={leaves}
        onChange={(v: string) => {
          setLeaves(v);
          change();
        }}
        description="Checked by someone else than who did it"
      />
      <TextInput
        label="If not"
        value={not}
        onChange={(v: string) => {
          setNot(v);
          change();
        }}
      />
    </FormLayout>
  );
}

/** A kind of work as a path of steps. Between them the rules are fixed; inside one the agent is free. */
export function Workflow() {
  const notes = useNotes();
  const { isDraft, view } = notes;
  const isNarrow = useMediaQuery("(max-width: 900px)");
  const { kinds, triggers } = view.playbook;
  const [path, setPath] = useState((kinds.find((k) => k.alone === "ask") ?? kinds[0])?.id ?? "");
  const k = kinds.find((x) => x.id === path) ?? kinds[0];
  const stat = (kind: Kind, s: Step) => view.steps[`workflow/${kind.id}/${s.id}`] ?? { first: 0, now: 0, line: 0 };
  const weakest = (kind: Kind) =>
    [...kind.steps].sort((a, b) => stat(kind, a).first - stat(kind, a).line - (stat(kind, b).first - stat(kind, b).line))[0];
  const [at, setAt] = useState<string | null>(null);
  if (k === undefined) return null;
  const here = k.steps;
  const s = here.find((x) => x.id === at) ?? weakest(k);
  if (s === undefined) return null;
  const begins = triggers.find((t) => typeof t.makes === "object" && "kind" in t.makes && t.makes.kind === k.id)?.name ?? "";
  const why = (id: string) => view.because[`workflow/${k.id}/${id}`]?.why;
  return (
    <VStack gap={5}>
      <Text type="supporting" color="secondary">
        The steps each kind of work goes through, and what must be true before the next one begins. Choose a step to change it.
      </Text>
      <HStack gap={3} vAlign="center" wrap="wrap">
        {isNarrow ? (
          <Selector
            label="Kind of work"
            isLabelHidden
            value={path}
            onChange={(v) => setPath(String(v))}
            options={kinds.map((x) => ({ value: x.id, label: x.name }))}
          />
        ) : (
          <SegmentedControl label="Kind of work" value={path} onChange={(v) => setPath(String(v))} size="sm">
            {kinds.map((x) => (
              <SegmentedControlItem key={x.id} value={x.id} label={x.name} />
            ))}
          </SegmentedControl>
        )}
        <Text type="supporting" color="secondary">
          Begins with: {begins}
        </Text>
      </HStack>
      <Grid columns={isNarrow ? 1 : here.length} gap={3}>
        {here.map((x, i) => (
          <SelectableCard key={x.id} label={x.name} isSelected={x.id === s.id} onChange={() => setAt(x.id)} padding={3}>
            <VStack gap={1}>
              <HStack gap={1} vAlign="center">
                <StackItem size="fill">
                  <Text type="supporting" color="secondary">
                    {String(i + 1)}
                  </Text>
                </StackItem>
                {i < here.length - 1 && !isNarrow && <Icon icon={ChevronRightIcon} size="sm" color="secondary" />}
              </HStack>
              <Text type="label">{x.name}</Text>
              <Text type="supporting" color="secondary">
                {by(x, notes)}
              </Text>
              <Text type="supporting" color="secondary">
                {isDraft ? stat(k, x).first : stat(k, x).now} of 100 go on the first time
              </Text>
              {isDraft && stat(k, x).first < stat(k, x).line && (
                <HStack>
                  <Token size="sm" color="red" label={`Aim ${stat(k, x).line}`} />
                </HStack>
              )}
            </VStack>
          </SelectableCard>
        ))}
      </Grid>
      <Card padding={4}>
        <VStack gap={4}>
          <HStack gap={2} vAlign="center">
            <StackItem size="fill">
              <HStack gap={2} vAlign="center">
                <Heading level={3} accessibilityLevel={2}>
                  {s.name}
                </Heading>
                {isDraft && why(s.id) !== undefined && (
                  <Token size="sm" color={why(s.id) === "my idea" ? "blue" : "gray"} label={upper(why(s.id) ?? "")} />
                )}
              </HStack>
            </StackItem>
            <Note at={s.name} />
          </HStack>
          <Edit key={`${k.id}/${s.id}`} s={s} k={k} />
        </VStack>
      </Card>
      <Divider />
      <KindRules key={path} k={k} />
    </VStack>
  );
}

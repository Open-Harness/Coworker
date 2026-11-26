import { useState } from "react";
import type { ISODateString } from "@astryxdesign/core/Calendar";
import { DateInput } from "@astryxdesign/core/DateInput";
import { Divider } from "@astryxdesign/core/Divider";
import { List, ListItem } from "@astryxdesign/core/List";
import { NumberInput } from "@astryxdesign/core/NumberInput";
import { Text } from "@astryxdesign/core/Text";
import { Reading } from "~/modules/page/service.ts";
import { useDay } from "./day.ts";
import { aimWords, limitWords, valueWords } from "./measure.ts";
import { useNotes } from "./notes.tsx";
import { Part } from "./part.tsx";
import { upper } from "./words.ts";

type Item = { readonly id: string; readonly name: string; readonly about: string; readonly end: string };

/** What must not get worse, as the manager's overview reads it: the name of each, what is counted, where it is read, how it stands. */
function Guards({ manager }: { readonly manager: string }) {
  const { isDraft } = useNotes();
  return (
    <Reading from="/m/:manager" parts={{ manager }}>
      {(overview) => (
        <Items
          items={overview.measures
            .filter((m) => m.role === "guard")
            .map((m) => ({
              id: m.tile.id,
              name: m.tile.label,
              about: `${m.counts}. ${m.read}`,
              end: isDraft ? aimWords(m) : `${valueWords(m.tile)}. ${aimWords(m)}`,
            }))}
        />
      )}
    </Reading>
  );
}
const Items = ({ items }: { readonly items: readonly Item[] }) => (
  <List density="balanced" hasDividers>
    {items.map((m) => (
      <ListItem
        key={m.id}
        label={m.name}
        description={
          <Text type="supporting" color="secondary">
            {m.about}
          </Text>
        }
        endContent={
          <Text type="supporting" color="secondary">
            {m.end}
          </Text>
        }
      />
    ))}
  </List>
);

/** What we want to get to. The words are the person’s; the numbers are how we would know. */
export function Objective({ onDirty }: { onDirty?: () => void }) {
  const { view, person } = useNotes();
  const date = useDay();
  const { objective, name } = view.playbook;
  const [target, setTarget] = useState(objective.aim.value);
  const [by, setBy] = useState<ISODateString | undefined>(objective.aim.by as ISODateString);
  const good = view.evals.find((one) => one.eval.of === "playbook")?.eval.good ?? objective.measure.counts;
  const said = `${view.saidBy.person}, ${date.day(view.saidBy.at)}`;
  const guards: readonly Item[] = objective.notWorse.map(({ measure, limit }) => ({
    id: measure.counts,
    name: measure.counts,
    about: measure.read.from === "person" ? `Asked of ${person(measure.read.person)}` : measure.read.query,
    end: limitWords(measure, limit),
  }));
  return (
    <>
      <Part title="What you said" about={`${said}. Kept in your words.`}>
        <Text type="body">{`“${objective.said}”`}</Text>
      </Part>
      <Divider />
      <Part title="How we would know" about={`${upper(objective.measure.counts)}.`}>
        <NumberInput
          label={good}
          value={target}
          onChange={(n: number) => {
            setTarget(n);
            onDirty?.();
          }}
          min={1}
          isIntegerOnly
        />
        <DateInput
          label="By"
          value={by}
          onChange={(d) => {
            setBy(d);
            onDirty?.();
          }}
        />
      </Part>
      <Divider />
      <Part
        title="What must not get worse"
        about={`When one of these does, ${name} stops taking on what it found, and asks ${upper(objective.owner)}.`}
      >
        {view.draft || view.head === null ? <Items items={guards} /> : <Guards manager={view.head.id} />}
      </Part>
    </>
  );
}

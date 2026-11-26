import { useState } from "react";
import { Field } from "@astryxdesign/core/Field";
import { VStack } from "@astryxdesign/core/Layout";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { Text } from "@astryxdesign/core/Text";
import { TextArea } from "@astryxdesign/core/TextArea";
import type { Kind } from "~/modules/playbook/types.ts";
import { money, MODE, MODE_DOES, MODES, type Mode } from "./words.ts";
import { useNotes } from "./notes.tsx";
import { Part } from "./part.tsx";

const first = (name: string): string => name.split(" ")[0] ?? name;

/** What a kind may do, in a sentence: the reading, what it only prepares, what asks, and what each piece of work may spend. */
function mayWords(kind: Kind, person: (id: string) => string): string {
  const on = (action: string): boolean => kind.may.some((g) => g.may[action] === "on");
  const asks = (action: string): boolean => kind.may.some((g) => g.may[action] === "ask");
  const reads = [on("crm.read") ? "the CRM" : "", on("web.read") ? "the web" : ""].filter((one) => one !== "");
  const says = [
    reads.length > 0
      ? `Read ${reads.join(" and ")}${on("email.draft") ? ", draft" : ""}.`
      : on("email.reply")
        ? "Reply in the same thread."
        : "",
    asks("email.send_outside")
      ? `Sending asks ${first(person(kind.steps.flatMap((s) => ("person" in s.by ? [s.by.person] : []))[0] ?? ""))}.`
      : "",
    asks("crm.add_lead") ? "Writing to the CRM asks." : "",
    kind.limits.perWork === undefined ? "" : `${money(kind.limits.perWork)} each.`,
  ];
  return says.filter((one) => one !== "").join(" ");
}

/** When something is this kind of work, whether it may start by itself, and when it is done. */
export function KindRules({ k }: { k: Kind }) {
  const { isDraft, change, view, person } = useNotes();
  const [when, setWhen] = useState(k.when);
  const [done, setDone] = useState(k.doneWhen.map((c) => c.says).join(". "));
  const [mode, setMode] = useState<Mode>(k.alone);
  const id = `mode-${k.id}`;
  return (
    <Part
      title={k.name}
      about={isDraft ? "When it is this, and whether it starts alone." : `${view.record[k.id] ?? ""}. ${mayWords(k, person)}`}
    >
      <TextArea
        label="It is this when"
        rows={2}
        value={when}
        onChange={(v: string) => {
          setWhen(v);
          change();
        }}
      />
      {k.id === "asked" ? (
        <VStack gap={1}>
          <Text type="label">When nobody asked</Text>
          <Text type="supporting" color="secondary">
            Somebody always did. It starts when someone who may ask does.
          </Text>
        </VStack>
      ) : (
        <Field label="When nobody asked" inputID={id} labelID={`${id}-l`} isGroupLabel description={MODE_DOES[mode]}>
          <SegmentedControl
            label="When nobody asked"
            aria-labelledby={`${id}-l`}
            value={mode}
            onChange={(v) => {
              setMode(v as Mode);
              change();
            }}
            layout="fill"
          >
            {MODES.map((m) => (
              <SegmentedControlItem key={m} value={m} label={MODE[m]} />
            ))}
          </SegmentedControl>
        </Field>
      )}
      <TextArea
        label="Done when"
        rows={2}
        value={done}
        onChange={(v: string) => {
          setDone(v);
          change();
        }}
      />
    </Part>
  );
}

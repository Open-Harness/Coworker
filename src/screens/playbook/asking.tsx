import { useState } from "react";
import { Divider } from "@astryxdesign/core/Divider";
import { VStack } from "@astryxdesign/core/Layout";
import { Selector } from "@astryxdesign/core/Selector";
import type { AskRule } from "~/modules/playbook/types.ts";
import { useNotes } from "./notes.tsx";
import { Part } from "./part.tsx";
import { accountName } from "./words.ts";

type Count = "asked" | "maybe" | "no";
const LET = [
  { value: "asked", label: "Counts as asking" },
  { value: "maybe", label: "Judged by kind" },
  { value: "no", label: "Starts nothing" },
];

function Let({ who, start }: { who: string; start: Count }) {
  const { change } = useNotes();
  const [v, set] = useState<string>(start);
  return (
    <Selector
      label={who}
      value={v}
      onChange={(x) => {
        set(String(x));
        change();
      }}
      options={LET}
    />
  );
}

/** Who a rule lets in, in the words of the connector it is for. */
function rowsOf(rule: AskRule, firstName: (id: string) => string): readonly (readonly [string, Count])[] {
  const { listed } = rule;
  const names = Array.isArray(listed.who) ? (listed.who as readonly string[]).map(firstName).join(" and ") : "";
  if (rule.account === "email")
    return [
      ["The team", "asked"],
      ["Strangers who write to it", rule.others],
      ["Bulk mail and bots", "no"],
    ];
  if (rule.account === "slack")
    return [
      [`${names}, speaking to it`, "asked"],
      ["The team, not speaking to it", rule.overheard],
      ["Guests in the channel", rule.others],
    ];
  return [["Someone changes a deal", "no"]];
}

/** Whose words count as asking, for each thing that arrives. Checked in code, before anything is judged. */
export function Asking() {
  const { view, person } = useNotes();
  const { triggers, reach } = view.playbook;
  return (
    <>
      {reach.mayAsk.map((rule) => {
        const trigger = triggers.find((t) => t.by === "event" && t.account === rule.account && t.place === rule.place);
        const name = trigger?.name ?? `${accountName(rule.account)} ${rule.place}`;
        const nobody = rule.others === "no" && rule.overheard === "no" && Array.isArray(rule.listed.who) && rule.listed.who.length === 0;
        const about = nobody
          ? "Nobody is behind it, so it starts nothing. Open work is told either way."
          : rule.account === "email"
            ? `To ${rule.place}, when it is really from who it says.`
            : "Heard in full, so that it knows what is going on.";
        return (
          <VStack key={`${rule.account}/${rule.place}`} gap={5}>
            <Divider />
            <Part title={`Who may ask: ${name}`} about={about}>
              {rowsOf(rule, (id) => person(id).split(" ")[0] ?? id).map(([who, start]) => (
                <Let key={who} who={who} start={start} />
              ))}
            </Part>
          </VStack>
        );
      })}
    </>
  );
}

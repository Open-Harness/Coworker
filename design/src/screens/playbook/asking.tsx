import { useState } from "react";
import { Divider } from "@astryxdesign/core/Divider";
import { VStack } from "@astryxdesign/core/Layout";
import { Selector } from "@astryxdesign/core/Selector";
import { Part } from "../../part";
import { useNotes } from "./notes";

const LET = [{ value: "asked", label: "Counts as asking" }, { value: "maybe", label: "Judged by kind" }, { value: "no", label: "Starts nothing" }];
const WHO: readonly (readonly [string, string, readonly (readonly [string, string])[]])[] = [
  ["Mail about buying", "To juno@acme.co-worker.tech, when it is really from who it says.", [["The team", "asked"], ["Strangers who write to it", "asked"], ["Bulk mail and bots", "no"]]],
  ["Slack #sales", "Heard in full, so that it knows what is going on.", [["Ama and Bo, speaking to it", "asked"], ["The team, not speaking to it", "maybe"], ["Guests in the channel", "no"]]],
  ["A deal moves in the CRM", "Nobody is behind it, so it starts nothing. Open work is told either way.", [["Someone changes a deal", "no"]]],
];
function Let({ who, start }: { who: string; start: string }) {
  const { change } = useNotes();
  const [v, set] = useState(start);
  return <Selector label={who} value={v} onChange={(x) => { set(x); change(); }} options={LET} />;
}
/** Whose words count as asking, for each thing that arrives. Checked in code, before anything is judged. */
export function Asking() {
  return <>{WHO.map(([name, about, rows]) => <VStack key={name} gap={5}><Divider /><Part title={`Who may ask: ${name}`} about={about}>{rows.map(([who, start]) => <Let key={who} who={who} start={start} />)}</Part></VStack>)}</>;
}

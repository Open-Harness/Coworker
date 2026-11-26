import { useState } from "react";
import { CheckboxInput } from "@astryxdesign/core/CheckboxInput";
import { Divider } from "@astryxdesign/core/Divider";
import { TextArea } from "@astryxdesign/core/TextArea";
import { useDoing } from "./act.ts";
import { Part } from "./part.tsx";
import type { JunoPage } from "./types.ts";

/** Who Juno is in its own words, and the lines it does not cross. Only the soul's words are saved: the console has no doing for the lines or for the suggestion switch, so those are shown and not edited. */
export function Soul({ view, onDirty }: JunoPage) {
  const [soul, setSoul] = useState(view.soul);
  const act = useDoing();
  return (
    <>
      <Part title="Soul" about="Who Juno is, in its own words. It reads this before everything else, and so does every manager and thread.">
        <TextArea
          label="Soul"
          isLabelHidden
          rows={13}
          value={soul}
          onChange={(next: string) => (setSoul(next), onDirty(() => act("soul.save", { text: next })))}
        />
        <CheckboxInput
          label="Juno may suggest a change to this"
          description="You see the old and the new beside each other, and say yes or no."
          value={view.mayPropose}
          isReadOnly
        />
      </Part>
      <Divider />
      <Part title="Never" about="Lines it does not cross, whoever asks.">
        <TextArea label="Never" isLabelHidden rows={4} value={view.never.join("\n")} isReadOnly />
      </Part>
    </>
  );
}

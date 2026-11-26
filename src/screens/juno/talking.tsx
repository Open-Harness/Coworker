import { useState } from "react";
import { Divider } from "@astryxdesign/core/Divider";
import { VStack } from "@astryxdesign/core/Layout";
import { TextArea } from "@astryxdesign/core/TextArea";
import { TextInput } from "@astryxdesign/core/TextInput";
import { useDoing } from "./act.ts";
import { Part } from "./part.tsx";
import type { JunoPage } from "./types.ts";

/** How Juno speaks to each group of people, and what it signs as. */
export function Talking({ view, onDirty }: JunoPage) {
  const [edits, setEdits] = useState<Readonly<Record<string, { readonly how: string; readonly sign: string }>>>({});
  const act = useDoing();
  const edit = (id: string, next: { readonly how: string; readonly sign: string }) => {
    const all = { ...edits, [id]: next };
    setEdits(all);
    onDirty(async () => {
      const done = await Promise.all(
        view.talking
          .filter((one) => all[one.id] !== undefined)
          .map((one) => act("talking.edit", { who: one.id, may: one.may, ...all[one.id] })),
      );
      return done.every(Boolean);
    });
  };
  return (
    <>
      {view.talking.map((group, at) => {
        const now = edits[group.id] ?? { how: group.how, sign: group.sign };
        return (
          <VStack key={group.id} gap={4}>
            {at > 0 && <Divider />}
            <Part title={group.who} about={group.may}>
              <TextArea
                label="How Juno speaks to them"
                rows={2}
                value={now.how}
                onChange={(how: string) => edit(group.id, { ...now, how })}
              />
              <TextInput label="Signs as" value={now.sign} onChange={(sign: string) => edit(group.id, { ...now, sign })} />
            </Part>
          </VStack>
        );
      })}
    </>
  );
}

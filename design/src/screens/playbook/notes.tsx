import { createContext, useContext, useState } from "react";
import { Avatar } from "@astryxdesign/core/Avatar";
import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Layout";
import { Heading, Text } from "@astryxdesign/core/Text";
import { TextArea } from "@astryxdesign/core/TextArea";
import { Icon } from "@astryxdesign/core/Icon";
import { useToast } from "@astryxdesign/core/Toast";
import { Token } from "@astryxdesign/core/Token";
import { VisuallyHidden } from "@astryxdesign/core/VisuallyHidden";
import { ChatBubbleLeftIcon } from "@heroicons/react/24/outline";
import type { Comment, Part } from "./data";

export type Said = Readonly<Record<string, "accepted" | "dismissed">>;
interface Ctx { readonly comments: readonly Comment[]; readonly said: Said; readonly isDraft: boolean; readonly part: string; readonly about: (at: string) => void; readonly change: () => void; readonly openSkill: (id: string) => void }
export const Notes = createContext<Ctx>({ comments: [], said: {}, isDraft: true, part: "", about: () => undefined, change: () => undefined, openSkill: () => undefined });
export const useNotes = () => useContext(Notes);
/** The change that was accepted about this thing, so that the page shows it. */
export function useAccepted(id: string): boolean { return useNotes().said[id] === "accepted"; }

/** Says something about this line. Shows how many already did. */
export function Note({ at }: { at: string }) {
  const { comments, said, about, part } = useNotes();
  const n = comments.filter((c) => c.on === part && c.at === at && !said[c.id]).length;
  return <Button label={n ? `${n}` : `Comment on ${at}`} {...(n ? { "aria-label": `${n} on ${at}` } : {})} size="sm" variant="ghost" isIconOnly={n === 0} icon={<Icon icon={ChatBubbleLeftIcon} size="sm" />} onClick={() => about(at)} />;
}

function One({ c, said, onSay }: { c: Comment; said: "accepted" | "dismissed" | undefined; onSay: (v: "accepted" | "dismissed") => void }) {
  return (
    <Card padding={3} variant={said ? "muted" : "default"}>
      <VStack gap={2}>
        <HStack gap={2} vAlign="center"><Avatar name={c.by} size="xsm" tooltip={false} /><StackItem size="fill"><Text type="supporting" weight="semibold">{c.by}</Text></StackItem><Text type="supporting" color="secondary">{c.when}</Text></HStack>
        <Text type="supporting" color="secondary">On “{c.at}”</Text>
        <Text type="body">{c.text}</Text>
        {c.reply && <VStack gap={1}><HStack gap={2} vAlign="center"><Avatar name="Juno" size="xsm" tooltip={false} /><Text type="supporting" weight="semibold">Juno</Text></HStack><Text type="body">{c.reply}</Text></VStack>}
        {c.change && <VStack gap={0.5}><Text type="supporting" color="secondary"><VisuallyHidden>Was: </VisuallyHidden><Text type="supporting" color="secondary" hasStrikethrough>{c.change.was}</Text></Text><Text type="supporting" weight="semibold"><VisuallyHidden>Becomes: </VisuallyHidden>{c.change.now}</Text></VStack>}
        {said ? <HStack><Token size="sm" color="gray" label={said === "accepted" ? (c.change ? "Accepted" : "Closed") : "Left as it was"} /></HStack> : (
          <HStack gap={2}>{c.change ? <><Button label="Accept" size="sm" variant="secondary" onClick={() => onSay("accepted")} /><Button label="Leave it" size="sm" variant="ghost" onClick={() => onSay("dismissed")} /></> : c.reply && <Button label="Close" size="sm" variant="secondary" onClick={() => onSay("accepted")} />}</HStack>
        )}
        {c.case && <Text type="supporting" color="secondary">Kept as a case for this skill</Text>}
      </VStack>
    </Card>
  );
}

/** Comments on the part that is open. Juno answers each with a change to accept, or with why not. */
export function Panel({ part, comments, said, at, onAt, onSay, onAdd }: { part: string; comments: readonly Comment[]; said: Said; at: string | null; onAt: (at: string | null) => void; onSay: (id: string, v: "accepted" | "dismissed") => void; onAdd: (text: string) => void }) {
  const [text, setText] = useState("");
  const showToast = useToast();
  const here = comments.filter((c) => c.on === (part as Part));
  const open = here.filter((c) => !said[c.id]).length;
  return (
    <VStack gap={4}>
      <HStack gap={2} vAlign="center"><StackItem size="fill"><Heading level={5} accessibilityLevel={2}>Comments on {part}</Heading></StackItem>{open > 0 && <Badge variant="neutral" label={`${open} open`} />}</HStack>
      {here.map((c) => <One key={c.id} c={c} said={said[c.id]} onSay={(v) => { onSay(c.id, v); showToast({ body: v === "dismissed" ? "Left as it was." : c.change ? "Changed." : "Closed.", uniqueID: c.id }); }} />)}
      {here.length === 0 && <Text type="supporting" color="secondary">Nobody has said anything here yet.</Text>}
      <VStack gap={2}>
        <TextArea label={at ? `About “${at}”` : "Say something about this part"} rows={3} value={text} onChange={(v: string) => setText(v)} placeholder="Juno answers with a change, or with why not" />
        <HStack gap={2}><Button label="Comment" size="sm" variant="secondary" isDisabled={text.trim() === ""} onClick={() => { onAdd(text.trim()); setText(""); }} />{at && <Button label="Not about this" size="sm" variant="ghost" onClick={() => onAt(null)} />}</HStack>
      </VStack>
    </VStack>
  );
}

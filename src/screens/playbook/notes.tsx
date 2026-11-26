// astryx-template: settings
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
import type { Comment } from "~/modules/views-manager/types.ts";
import type { PlaybookView } from "~/modules/views-manager/types.ts";
import { nameOfLine, type Part } from "./words.ts";

/** A comment as it is shown: what it is on, who said it, and what Juno answered, or the change it offers. */
export interface Shown {
  readonly id: string;
  readonly part: Part;
  readonly line: string;
  readonly on: string;
  readonly by: string;
  readonly when: string;
  readonly text: string;
  readonly reply: string | null;
  readonly change: { readonly was: string; readonly now: string } | null;
  readonly isCase: boolean;
}
export type Said = Readonly<Record<string, "accepted" | "dismissed">>;

export function shownOf(view: PlaybookView, comment: Comment, when: { day: (at: number) => string; time: (at: number) => string }): Shown {
  const { became } = comment;
  const reply = became._tag === "Change" ? became.says : became._tag === "Open" ? "" : became.text;
  const said = view.draft ? `${when.day(comment.at)}, ${when.time(comment.at)}` : when.day(comment.at);
  return {
    id: comment.id,
    part: comment.part,
    line: comment.on,
    on: comment.quote ?? nameOfLine(view, comment.on),
    by: comment.by,
    when: said,
    text: comment.text,
    reply: reply === "" ? null : reply,
    change: became._tag === "Change" ? { was: became.change.was ?? "", now: became.change.becomes ?? "" } : null,
    isCase: (became._tag === "Change" && became.case !== null) || became._tag === "Case",
  };
}

export interface Ctx {
  readonly view: PlaybookView;
  readonly comments: readonly Shown[];
  readonly said: Said;
  readonly isDraft: boolean;
  readonly part: string;
  readonly about: (at: string) => void;
  readonly change: () => void;
  readonly openSkill: (id: string) => void;
  /** The name of a person by their id, as the workspace has it. */
  readonly person: (id: string) => string;
}
export const Notes = createContext<Ctx | undefined>(undefined);
export function useNotes(): Ctx {
  const notes = useContext(Notes);
  if (notes === undefined) throw new Error("No Notes above this part");
  return notes;
}
/** The change that was accepted about this thing, so that the page shows it. */
export function useAccepted(id: string): boolean {
  return useNotes().said[id] === "accepted";
}

/** Says something about this line. Shows how many already did. */
export function Note({ at }: { at: string }) {
  const { comments, said, about, part } = useNotes();
  const n = comments.filter((c) => c.part === part && c.on === at && !said[c.id]).length;
  return (
    <Button
      label={n > 0 ? `${n}` : `Comment on ${at}`}
      {...(n > 0 ? { "aria-label": `${n} on ${at}` } : {})}
      size="sm"
      variant="ghost"
      isIconOnly={n === 0}
      icon={<Icon icon={ChatBubbleLeftIcon} size="sm" />}
      onClick={() => about(at)}
    />
  );
}

type Say = "accepted" | "dismissed";
function One({ c, said, onSay }: { c: Shown; said: Say | undefined; onSay: (v: Say) => void }) {
  return (
    <Card padding={3} variant={said ? "muted" : "default"}>
      <VStack gap={2}>
        <HStack gap={2} vAlign="center">
          <Avatar name={c.by} size="xsm" tooltip={false} />
          <StackItem size="fill">
            <Text type="supporting" weight="semibold">
              {c.by}
            </Text>
          </StackItem>
          <Text type="supporting" color="secondary">
            {c.when}
          </Text>
        </HStack>
        <Text type="supporting" color="secondary">
          On “{c.on}”
        </Text>
        <Text type="body">{c.text}</Text>
        {c.reply !== null && (
          <VStack gap={1}>
            <HStack gap={2} vAlign="center">
              <Avatar name="Juno" size="xsm" tooltip={false} />
              <Text type="supporting" weight="semibold">
                Juno
              </Text>
            </HStack>
            <Text type="body">{c.reply}</Text>
          </VStack>
        )}
        {c.change !== null && (
          <VStack gap={0.5}>
            <Text type="supporting" color="secondary">
              <VisuallyHidden>Was: </VisuallyHidden>
              <Text type="supporting" color="secondary" hasStrikethrough>
                {c.change.was}
              </Text>
            </Text>
            <Text type="supporting" weight="semibold">
              <VisuallyHidden>Becomes: </VisuallyHidden>
              {c.change.now}
            </Text>
          </VStack>
        )}
        {said ? (
          <HStack>
            <Token size="sm" color="gray" label={said === "accepted" ? (c.change ? "Accepted" : "Closed") : "Left as it was"} />
          </HStack>
        ) : (
          <HStack gap={2}>
            {c.change ? (
              <>
                <Button label="Accept" size="sm" variant="secondary" onClick={() => onSay("accepted")} />
                <Button label="Leave it" size="sm" variant="ghost" onClick={() => onSay("dismissed")} />
              </>
            ) : (
              c.reply !== null && <Button label="Close" size="sm" variant="secondary" onClick={() => onSay("accepted")} />
            )}
          </HStack>
        )}
        {c.isCase && (
          <Text type="supporting" color="secondary">
            Kept as a case for this skill
          </Text>
        )}
      </VStack>
    </Card>
  );
}

interface PanelProps {
  readonly part: string;
  readonly comments: readonly Shown[];
  readonly said: Said;
  readonly at: string | null;
  readonly onAt: (at: string | null) => void;
  readonly onSay: (id: string, v: Say) => void;
  readonly onAdd: (text: string) => void;
}
/** Comments on the part that is open. Juno answers each with a change to accept, or with why not. */
export function Panel({ part, comments, said, at, onAt, onSay, onAdd }: PanelProps) {
  const [text, setText] = useState("");
  const showToast = useToast();
  const here = comments.filter((c) => c.part === part);
  const open = here.filter((c) => !said[c.id]).length;
  return (
    <VStack gap={4}>
      <HStack gap={2} vAlign="center">
        <StackItem size="fill">
          <Heading level={5} accessibilityLevel={2}>
            Comments on {part}
          </Heading>
        </StackItem>
        {open > 0 && <Badge variant="neutral" label={`${open} open`} />}
      </HStack>
      {here.map((c) => (
        <One
          key={c.id}
          c={c}
          said={said[c.id]}
          onSay={(v) => {
            onSay(c.id, v);
            showToast({ body: v === "dismissed" ? "Left as it was." : c.change ? "Changed." : "Closed.", uniqueID: c.id });
          }}
        />
      ))}
      {here.length === 0 && (
        <Text type="supporting" color="secondary">
          Nobody has said anything here yet.
        </Text>
      )}
      <VStack gap={2}>
        <TextArea
          label={at ? `About “${at}”` : "Say something about this part"}
          rows={3}
          value={text}
          onChange={(v: string) => setText(v)}
          placeholder="Juno answers with a change, or with why not"
        />
        <HStack gap={2}>
          <Button
            label="Comment"
            size="sm"
            variant="secondary"
            isDisabled={text.trim() === ""}
            onClick={() => {
              onAdd(text.trim());
              setText("");
            }}
          />
          {at && <Button label="Not about this" size="sm" variant="ghost" onClick={() => onAt(null)} />}
        </HStack>
      </VStack>
    </VStack>
  );
}

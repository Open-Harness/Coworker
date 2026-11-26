// astryx-template: settings
import { Button } from "@astryxdesign/core/Button";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import { HStack, LayoutHeader, StackItem, VStack } from "@astryxdesign/core/Layout";
import { Heading, Text } from "@astryxdesign/core/Text";
import { useToast } from "@astryxdesign/core/Toast";
import type { PlaybookView } from "~/modules/views-manager/types.ts";
import type { useChanges } from "./changes.ts";
import { useDay } from "./day.ts";

interface Props {
  readonly view: PlaybookView;
  readonly since: number | null;
  /** Comments nobody has answered, in all of it, and on the part that is open. */
  readonly waiting: number;
  readonly comments: number;
  readonly isTalkable: boolean;
  readonly isDirty: boolean;
  readonly changes: ReturnType<typeof useChanges>;
  readonly onTalk: () => void;
  readonly onSaved: () => void;
}

/** The title of a draft, or the version that runs, and what the person may do about it. */
export function Header({ view, since, waiting, comments, isTalkable, isDirty, changes, onTalk, onSaved }: Props) {
  const isNarrow = useMediaQuery("(max-width: 900px)");
  const [date, showToast] = [useDay(), useToast()];
  const isDraft = view.draft;
  return (
    <LayoutHeader hasDivider>
      <HStack gap={2} vAlign="center" wrap="wrap">
        <StackItem size="fill">
          {isDraft ? (
            <VStack gap={0}>
              <Heading level={1}>{view.playbook.name}, a draft</Heading>
              <Text type="supporting" color="secondary">
                Nothing is made yet. {waiting > 0 ? `${waiting} comments open.` : "No comments open."}
              </Text>
            </VStack>
          ) : (
            <Text type="supporting" color="secondary">
              Version {view.version}
              {since === null ? "" : `, since ${date.day(since)}`}. A change reaches open work, and never widens it.
            </Text>
          )}
        </StackItem>
        {isTalkable && (
          <Button label={comments > 0 ? `Comments, ${comments}` : "Comments"} size="sm" variant="ghost" onClick={() => onTalk()} />
        )}
        {isDraft ? (
          <>
            {!isNarrow && <Button label="Back to the questions" size="sm" variant="ghost" onClick={changes.back} />}
            <Button
              label="Try again"
              aria-label="Try again on past work"
              size="sm"
              variant="secondary"
              onClick={() => showToast({ body: "Tried again on the same past work, sending nothing.", uniqueID: "try" })}
            />
            <Button label="Make it" size="sm" variant="primary" onClick={() => void changes.make()} />
          </>
        ) : (
          <>
            <Button
              label="Try on past work"
              size="sm"
              variant="secondary"
              onClick={() => showToast({ body: "Tried on the past work, sending nothing.", uniqueID: "try" })}
            />
            <Button
              label={`Save as version ${view.version + 1}`}
              size="sm"
              variant="primary"
              isDisabled={!isDirty}
              onClick={() => {
                onSaved();
                void changes.save();
              }}
            />
          </>
        )}
      </HStack>
    </LayoutHeader>
  );
}

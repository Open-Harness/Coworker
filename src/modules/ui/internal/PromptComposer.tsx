import { useMemo, useRef } from "react";
import { AtSymbolIcon } from "@heroicons/react/24/outline";
import {
  ChatComposer,
  ChatComposerDrawer,
  ChatComposerInput,
  type ChatComposerInputHandle,
  type ChatComposerTrigger,
} from "@astryxdesign/core/Chat";
import { DropdownMenu } from "@astryxdesign/core/DropdownMenu";
import { Icon } from "@astryxdesign/core/Icon";
import { Token } from "@astryxdesign/core/Token";
import { createStaticSource } from "@astryxdesign/core/Typeahead";
import type { DocumentRow } from "~/modules/protocol/types.ts";
import type { PromptComposerProps } from "../types.ts";
import { documentToken } from "./document-token.ts";
import { ModelControls } from "./ModelControls.tsx";

function documentTrigger(documents: readonly DocumentRow[]): ChatComposerTrigger {
  return {
    character: "@",
    searchSource: createStaticSource(documents.map(({ id, title }) => ({ id, label: title }))),
    onSelect: ({ label }) => documentToken(label),
    emptySearchText: "No documents",
    menuLabel: "Documents",
  };
}

type Running = NonNullable<PromptComposerProps["running"]>;
const MODES = { followUp: "Send after this answer", steer: "Send into this answer" } as const;

function WhenBusyMenu({ mode, onMode }: Running) {
  return (
    <DropdownMenu
      button={{ label: MODES[mode], variant: "ghost", size: "sm" }}
      items={[
        { label: MODES.followUp, onClick: () => onMode("followUp") },
        { label: MODES.steer, onClick: () => onMode("steer") },
      ]}
    />
  );
}

function QueuedPrompts({ queued = [], onWithdraw }: Pick<PromptComposerProps, "queued" | "onWithdraw">) {
  return (
    <ChatComposerDrawer count={queued.length} label="Waiting">
      {queued.map(({ id, label }) => (
        <Token key={id} label={label} onRemove={() => onWithdraw?.(id)} />
      ))}
    </ChatComposerDrawer>
  );
}

/** Where people write: text with document references, the model to answer, and what to do while it is answering. */
export function PromptComposer(props: PromptComposerProps) {
  const { value, documents, running, queued = [], problem } = props;
  const input = useRef<ChatComposerInputHandle>(null);
  const triggers = useMemo(() => [documentTrigger(documents)], [documents]);
  const refer = (document: DocumentRow) => {
    input.current?.focus();
    input.current?.insertToken(documentToken(document.title));
  };
  return (
    <ChatComposer
      value={value}
      onChange={props.onChange}
      onSubmit={props.onSubmit}
      placeholder={props.placeholder}
      isDisabled={props.isDisabled === true}
      isStopShown={running !== undefined && value.trim() === ""}
      {...(running === undefined ? {} : { onStop: running.onStop })}
      {...(problem === undefined ? {} : { status: { type: "error" as const, message: problem } })}
      input={<ChatComposerInput handleRef={input} triggers={triggers} />}
      drawer={queued.length > 0 ? <QueuedPrompts {...props} /> : undefined}
      headerActions={
        documents.length > 0 ? (
          <DropdownMenu
            button={{
              label: "Refer to a document",
              variant: "ghost",
              size: "sm",
              icon: <Icon icon={AtSymbolIcon} size="sm" />,
              isIconOnly: true,
            }}
            hasChevron={false}
            menuWidth={240}
            items={documents.map((document) => ({ label: document.title, onClick: () => refer(document) }))}
          />
        ) : undefined
      }
      headerContext={props.headerContext}
      footerActions={
        <>
          {props.extraActions}
          {props.isModelFixed !== true && <ModelControls {...props} />}
          {running !== undefined && <WhenBusyMenu {...running} />}
        </>
      }
    />
  );
}

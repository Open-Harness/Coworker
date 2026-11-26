import { useMemo, useState } from "react";
import { useClock, useRead } from "~/modules/page/service.ts";
import { threadOf } from "./adapt.ts";
import type { Conversation } from "./data.ts";
import { ConversationPane, type PaneActions } from "./pane.tsx";
import { useSending } from "../whatsapp/sending.ts";
import { useAsk } from "./ask.ts";

/** The conversation that is open: its stream is read when it is opened, and what is said in it goes through the connector. */
export function OpenConversation(props: {
  readonly manager: string;
  readonly who: string;
  readonly zone: string;
  readonly conversation: Conversation;
  readonly onClose: () => void;
  readonly isFullWidth: boolean;
  readonly act: PaneActions["act"];
}) {
  const { manager, who, zone, conversation, act } = props;
  const clock = useClock();
  const read = useRead("/m/:manager/connectors/email/:conversation", { manager, conversation: conversation.id });
  const sending = useSending("email", manager);
  const answer = useAsk();
  const thread = useMemo(() => (read._tag === "Ok" ? threadOf(read.value.stream, clock, zone, who) : []), [read, clock, zone, who]);
  const [edited, setEdited] = useState<Readonly<Record<string, string[]>>>({});
  const edit = (draft: string, body: string[]) => setEdited((was) => ({ ...was, [draft]: body }));
  const items = thread.map((item) =>
    item.kind === "draft" && edited[item.id] !== undefined ? { ...item, body: edited[item.id] ?? item.body } : item,
  );
  const open: Conversation = { ...conversation, thread: items };
  return (
    <ConversationPane
      conversation={open}
      manager={manager}
      who={who}
      onClose={props.onClose}
      isFullWidth={props.isFullWidth}
      act={act}
      onTell={(id, text) => void sending.send(id, "tell", text)}
      onWrite={(id, text) => void sending.send(id, "write", text)}
      onHandBack={(id) => void sending.send(id, "hand back", "")}
      onChangeDraft={(_id, draft, text) => edit(draft, text.split("\n\n").filter(Boolean))}
      onSendDraft={(_id, draft) => {
        const item = thread.find((t) => t.id === draft);
        if (item?.kind === "draft") void answer(item.ask);
      }}
    />
  );
}

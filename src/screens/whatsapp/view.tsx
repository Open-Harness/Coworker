// astryx-template: messaging-shell
import { useState } from "react";
import { Avatar } from "@astryxdesign/core/Avatar";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Icon } from "@astryxdesign/core/Icon";
import { HStack } from "@astryxdesign/core/Layout";
import { UserGroupIcon } from "@heroicons/react/24/outline";
import { Reading, useClock, useGo, useRead } from "~/modules/page/service.ts";
import type { ChatsOnPhoneView } from "~/modules/views-connector/types.ts";
import { chatOf, type FilterId } from "./chats.ts";
import { ChatList } from "./list.tsx";
import { Lines } from "./lines.tsx";
import { Pane } from "./pane.tsx";
import { SendBox, Yours } from "./send-box.tsx";
import { linesOf } from "./stream.ts";
import { useSending } from "./sending.ts";
import type { Mode } from "./types.ts";

function useOpenChat({
  manager,
  id,
  who,
  zone,
}: {
  readonly manager: string;
  readonly id: string;
  readonly who: string;
  readonly zone: string;
}) {
  const clock = useClock();
  const read = useRead("/m/:manager/connectors/whatsapp/:conversation", { manager, conversation: id });
  const sending = useSending("whatsapp", manager);
  const [mode, setMode] = useState<Mode>("tell");
  if (read._tag !== "Ok") return { lines: [], yours: false, stopped: false, composer: null, handBack: undefined };
  const { conversation, stream } = read.value;
  const yours = conversation.has !== "manager";
  return {
    lines: linesOf(stream, { clock, who }, zone),
    yours,
    stopped: conversation.stopped,
    handBack: () => void sending.send(id, "hand back", ""),
    composer: (
      <SendBox
        who={who}
        mode={mode}
        onMode={setMode}
        onSend={(text) => void sending.send(id, mode, text)}
        about="chat"
        isDisabled={conversation.stopped}
        disabledHint="They asked us to stop. Nothing can be sent here."
      />
    ),
  };
}

/** One number's chats: the list, and the conversation that is open. */
function Chats({
  manager,
  view,
  who,
  zone,
}: {
  readonly manager: string;
  readonly view: ChatsOnPhoneView;
  readonly who: string;
  readonly zone: string;
}) {
  const clock = useClock();
  const go = useGo();
  const [open, setOpen] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<FilterId>("all");
  const [seen, setSeen] = useState<ReadonlySet<string>>(new Set());

  const chats = view.conversations.map((c) => chatOf(c, clock));
  const query = q.trim().toLowerCase();
  const shown = chats.filter(
    (c) => (filter === "all" || c.state === filter) && (c.name.toLowerCase().includes(query) || c.about.toLowerCase().includes(query)),
  );
  const chat = chats.find((c) => c.id === (open ?? shown[0]?.id ?? chats[0]?.id));
  const current = useOpenChat({ manager, id: chat?.id ?? "", who, zone });
  const unread = Object.fromEntries(chats.map((c) => [c.id, seen.has(c.id) ? 0 : c.unread]));
  return (
    <Pane
      isOpen={isOpen}
      onBack={() => setIsOpen(false)}
      list={
        <ChatList
          chats={shown}
          banner={
            view.works ? null : (
              <Banner
                status="warning"
                title={`Offline since ${clock.time(view.since)}`}
                description="Nothing has come in since, and what the desk wrote after is not sent yet."
                endContent={<Button label="Scan the code" variant="secondary" size="sm" onClick={() => go("/settings/connectors")} />}
              />
            )
          }
          workHref={(id) => `/m/${manager}/work/${id}`}
          unread={unread}
          selected={chat?.id ?? null}
          q={q}
          onQ={setQ}
          filter={filter}
          onFilter={setFilter}
          onOpen={(id) => {
            setOpen(id);
            setIsOpen(true);
            setSeen((was) => new Set(was).add(id));
          }}
        />
      }
      lead={chat?.isGroup === true ? <Icon icon={UserGroupIcon} size="sm" /> : <Avatar name={chat?.name ?? ""} size="sm" />}
      title={chat?.name ?? ""}
      subtitle={chat?.about ?? ""}
      actions={
        <HStack gap={2} vAlign="center" wrap="wrap">
          {current.yours && current.handBack !== undefined ? <Yours onBack={current.handBack} /> : null}
          {chat?.work ? (
            <Button label={chat.work.id} variant="ghost" size="sm" onClick={() => go(`/m/${manager}/work/${chat.work?.id ?? ""}`)} />
          ) : null}
        </HStack>
      }
      stream={<Lines lines={current.lines} />}
      composer={current.composer}
    />
  );
}

export default function WhatsappView({ manager }: { readonly manager: string }) {
  const shell = useRead("/shell");
  if (shell._tag !== "Ok") return null;
  const { coworker, workspace } = shell.value;
  return (
    <Reading from="/m/:manager/connectors/whatsapp" parts={{ manager }} failed="We could not read this number's chats">
      {(view) => <Chats manager={manager} view={view} who={coworker.name} zone={workspace.zone} />}
    </Reading>
  );
}

// astryx-template: messaging-shell
import { useState } from "react";
import { Avatar } from "@astryxdesign/core/Avatar";
import { Button } from "@astryxdesign/core/Button";
import { HStack } from "@astryxdesign/core/Layout";
import { UserGroupIcon } from "@heroicons/react/24/outline";
import { Icon } from "@astryxdesign/core/Icon";
import { manager } from "../../world";
import { go } from "../../shell";
import { CHATS, type FilterId } from "./data";
import { ChatList } from "./list";
import { Lines } from "./lines";
import { Pane } from "./pane";
import { sentLines, SendBox, Yours } from "./send-box";
import type { Line, Mode } from "./types";

export default function WhatsappView({ manager: id }: { manager: string }) {
  const who = "Juno";
  const [lines, setLines] = useState<Record<string, readonly Line[]>>(() => Object.fromEntries(CHATS.map((c) => [c.id, c.lines])));
  const [unread, setUnread] = useState<Record<string, number>>(() => Object.fromEntries(CHATS.map((c) => [c.id, c.unread])));
  const [open, setOpen] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<FilterId>("all");
  const [modes, setModes] = useState<Record<string, Mode>>({});
  const [yours, setYours] = useState<Record<string, boolean>>({});
  const [count, setCount] = useState(0);

  const query = q.trim().toLowerCase();
  const shown = CHATS.filter((c) => (filter === "all" || c.state === filter) && (c.name.toLowerCase().includes(query) || c.about.toLowerCase().includes(query)));
  const chat = CHATS.find((c) => c.id === (open ?? shown[0]?.id ?? CHATS[0]!.id))!;
  const mode = modes[chat.id] ?? "tell";

  const openChat = (cid: string) => { setOpen(cid); setIsOpen(true); setUnread((u) => ({ ...u, [cid]: 0 })); };
  const send = (text: string) => {
    if (!text.trim()) return;
    const next = count + 1;
    setCount(next);
    setLines((all) => ({ ...all, [chat.id]: [...(all[chat.id] ?? []), ...sentLines(mode, who, text, next, yours[chat.id] ?? false)] }));
    if (mode === "write") setYours((y) => ({ ...y, [chat.id]: true }));
  };
  const handBack = () => {
    setYours((y) => ({ ...y, [chat.id]: false })); setModes((x) => ({ ...x, [chat.id]: "tell" }));
    setLines((all) => ({ ...all, [chat.id]: [...(all[chat.id] ?? []), { kind: "note", id: `h${count}`, text: `${who} has it again` }] }));
    setCount(count + 1);
  };

  return (
    <Pane
      isOpen={isOpen}
      onBack={() => setIsOpen(false)}
      list={<ChatList chats={shown} unread={unread} selected={chat.id} q={q} onQ={setQ} filter={filter} onFilter={setFilter} onOpen={openChat} />}
      lead={chat.isGroup ? <Icon icon={UserGroupIcon} size="sm" /> : <Avatar name={chat.name} size="sm" />}
      title={chat.name}
      subtitle={chat.about}
      actions={
        <HStack gap={2} vAlign="center" wrap="wrap">
          {yours[chat.id] ? <Yours onBack={handBack} /> : null}
          {chat.work ? <Button label={chat.work.id} variant="ghost" size="sm" onClick={() => go("m-coding-board")} /> : null}
        </HStack>
      }
      stream={<Lines lines={lines[chat.id] ?? []} />}
      composer={<SendBox who={who} mode={mode} onMode={(m) => setModes((x) => ({ ...x, [chat.id]: m }))} onSend={send} about="chat" isDisabled={chat.stopped ?? false} disabledHint="They asked us to stop. Nothing can be sent here." />}
    />
  );
}

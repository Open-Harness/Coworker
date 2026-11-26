// astryx-template: messaging-shell
import { useState } from "react";
import { Avatar } from "@astryxdesign/core/Avatar";
import { Card } from "@astryxdesign/core/Card";
import { Icon } from "@astryxdesign/core/Icon";
import { Text } from "@astryxdesign/core/Text";
import { HashtagIcon as ChannelIcon } from "@heroicons/react/24/outline";
import { manager } from "../../world";
import { Lines } from "../whatsapp/lines";
import { Pane } from "../whatsapp/pane";
import { sentLines } from "../whatsapp/send-box";
import type { Line, Mode, Msg } from "../whatsapp/types";
import { CONVERSATIONS, THREADS, type Thread } from "./data";
import { SlackList } from "./list";
import { ThreadView } from "./thread";

const LABEL = { working: "Juno is working", asks: "Juno asked who decides", answered: "" } as const;

export default function SlackView({ manager: id }: { manager: string }) {
  const who = "Juno";
  const [conv, setConv] = useState("engineering");
  const [thread, setThread] = useState<string | null>("t-export");
  const [isOpen, setIsOpen] = useState(false);
  const [q, setQ] = useState("");
  const [unread, setUnread] = useState<Record<string, number>>(() => Object.fromEntries(CONVERSATIONS.map((c) => [c.id, c.unread])));
  const [replies, setReplies] = useState<Record<string, readonly Line[]>>(() => Object.fromEntries(THREADS.map((t) => [t.id, t.replies])));
  const [modes, setModes] = useState<Record<string, Mode>>({});
  const [yours, setYours] = useState<Record<string, boolean>>({});
  const [count, setCount] = useState(0);

  const cv = CONVERSATIONS.find((c) => c.id === conv)!;
  const t = THREADS.find((x) => x.id === thread && x.conv === conv);
  const root = t ? (cv.lines.find((l) => l.id === t.root) as Msg) : undefined;
  const above = t ? cv.lines.slice(0, cv.lines.findIndex((l) => l.id === t.root)).filter((l) => l.kind === "msg").length : 0;
  const label = (m: Msg) => {
    const x = THREADS.find((th) => th.id === m.thread);
    if (!x) return undefined;
    const n = (replies[x.id] ?? []).filter((r) => r.kind === "msg").length;
    return [`${n} ${n === 1 ? "reply" : "replies"}`, LABEL[x.state]].filter(Boolean).join(" · ");
  };

  const openConv = (cid: string) => { setConv(cid); setThread(null); setIsOpen(true); setUnread((u) => ({ ...u, [cid]: 0 })); };
  const openThread = (x: Thread) => { setConv(x.conv); setThread(x.id); setIsOpen(true); setUnread((u) => ({ ...u, [x.conv]: 0 })); };
  const send = (text: string) => {
    if (!t || !text.trim()) return;
    const mode = modes[t.id] ?? "tell";
    const next = count + 1;
    setCount(next);
    setReplies((r) => ({ ...r, [t.id]: [...(r[t.id] ?? []), ...sentLines(mode, who, text, next, yours[t.id] ?? false)] }));
    if (mode === "write") setYours((y) => ({ ...y, [t.id]: true }));
  };
  const handBack = () => {
    if (!t) return;
    setYours((y) => ({ ...y, [t.id]: false })); setModes((x) => ({ ...x, [t.id]: "tell" }));
    setReplies((r) => ({ ...r, [t.id]: [...(r[t.id] ?? []), { kind: "note", id: `h${count}`, text: `${who} has it again` }] }));
    setCount(count + 1);
  };

  return (
    <Pane
      isOpen={isOpen}
      onBack={() => setIsOpen(false)}
      list={<SlackList q={q} onQ={setQ} selectedConv={conv} selectedThread={t?.id ?? null} unread={unread} onOpen={openConv} onThread={openThread} />}
      lead={cv.kind === "channel" ? <Icon icon={ChannelIcon} size="sm" /> : <Avatar name={cv.name} size="sm" />}
      title={cv.kind === "channel" ? `#${cv.name}` : cv.name}
      subtitle={cv.topic}
      stream={<Lines lines={cv.lines} threadLabel={label} onThread={(m) => { const x = THREADS.find((th) => th.id === m.thread); if (x) openThread(x); }} />}
      composer={<Card variant="muted" padding={3}><Text type="supporting" color="secondary">{who} only speaks where it is asked. Write @{who} in a message, and its answer comes in a thread.</Text></Card>}
      thread={t && root ? (
        <ThreadView t={t} cv={cv} root={root} above={above} replies={replies[t.id] ?? []} who={who} mode={modes[t.id] ?? "tell"} onMode={(m) => setModes((x) => ({ ...x, [t.id]: m }))}
          isYours={yours[t.id] ?? false} onSend={send} onHandBack={handBack} onClose={() => setThread(null)} />
      ) : null}
      isThreadOpen={Boolean(t)}
      onThreadOpenChange={(o) => { if (!o) setThread(null); }}
    />
  );
}

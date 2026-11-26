// astryx-template: messaging-shell
import { useState } from "react";
import { Avatar } from "@astryxdesign/core/Avatar";
import { Card } from "@astryxdesign/core/Card";
import { Icon } from "@astryxdesign/core/Icon";
import { Text } from "@astryxdesign/core/Text";
import { HashtagIcon as ChannelIcon } from "@heroicons/react/24/outline";
import { Reading, useClock, useRead } from "~/modules/page/service.ts";
import type { SlackThread, SlackView } from "~/modules/views-connector/types.ts";
import { Lines } from "../whatsapp/lines.tsx";
import { Pane } from "../whatsapp/pane.tsx";
import { useSending } from "../whatsapp/sending.ts";
import { linesOf } from "../whatsapp/stream.ts";
import type { Mode, Msg } from "../whatsapp/types.ts";
import { SlackList } from "./list.tsx";
import { ThreadView } from "./thread.tsx";

const LABEL = { working: "Juno is working", asks: "Juno asked who decides", answered: "" } as const;
const plural = (n: number): string => `${n} ${n === 1 ? "reply" : "replies"}`;

/** The thread beside the stream sends through its own conversation: its id. */
function Sender({
  manager,
  thread,
  who,
  mode,
  onMode,
  ...rest
}: Omit<Parameters<typeof ThreadView>[0], "onSend" | "onHandBack"> & { readonly manager: string; readonly thread: string }) {
  const sending = useSending("slack", manager);
  return (
    <ThreadView
      {...rest}
      who={who}
      mode={mode}
      onMode={onMode}
      onSend={(text) => void sending.send(thread, mode, text)}
      onHandBack={() => void sending.send(thread, "hand back", "")}
    />
  );
}

interface Props {
  readonly manager: string;
  readonly view: SlackView;
  readonly who: string;
  readonly zone: string;
  readonly thread: string | null | undefined;
  readonly onChannel: (channel: string, thread: string | null) => void;
  readonly onThread: (thread: string | null) => void;
}

function Slack({ manager, view, who, zone, thread, onChannel, onThread }: Props) {
  const clock = useClock();
  const [isOpen, setIsOpen] = useState(false);
  const [q, setQ] = useState("");
  const [seen, setSeen] = useState<ReadonlySet<string>>(new Set());
  const [modes, setModes] = useState<Readonly<Record<string, Mode>>>({});
  const open = view.open;
  const channel = view.channels.find((c) => c.id === open.id);
  const threads = view.channels.flatMap((c) => c.threads);
  const at = thread === undefined ? open.thread : thread;
  const shown = open.threads.find((t) => t.id === at);
  const say = { clock, who };
  const lines = linesOf(open.stream, say, zone);
  const threadOf = new Map(open.stream.map((e) => [e.id, e.thread]));
  const stream = lines.map((l) => (l.kind === "msg" && threadOf.get(l.id) ? { ...l, thread: threadOf.get(l.id) ?? "" } : l));
  const rootAt = shown === undefined ? -1 : open.stream.findIndex((e) => e.id === shown.root);
  const root = shown === undefined ? undefined : lines.find((l) => l.id === shown.root);
  const above = open.stream.slice(0, Math.max(rootAt, 0)).filter((e) => e.is !== "note").length;
  const label = (m: Msg): string | undefined => {
    const t: SlackThread | undefined = threads.find((x) => x.id === m.thread);
    if (t === undefined) return undefined;
    const n = open.threads.find((x) => x.id === t.id)?.replies.filter((r) => r.is === "in" || r.is === "out").length;
    return [n === undefined ? undefined : plural(n), LABEL[t.state]].filter(Boolean).join(" · ");
  };
  const place = channel === undefined ? "" : channel.kind === "channel" ? `#${channel.name}` : channel.name;
  const openThread = (t: SlackThread, c: string) => {
    onChannel(c, t.id);
    setIsOpen(true);
    setSeen((was) => new Set(was).add(c));
  };
  const unread = Object.fromEntries(view.channels.map((c) => [c.id, seen.has(c.id) ? 0 : c.unread]));
  return (
    <Pane
      isOpen={isOpen}
      onBack={() => setIsOpen(false)}
      list={
        <SlackList
          channels={view.channels}
          q={q}
          onQ={setQ}
          selectedConv={open.id}
          selectedThread={shown?.id ?? null}
          unread={unread}
          onOpen={(id) => {
            onChannel(id, null);
            setIsOpen(true);
            setSeen((was) => new Set(was).add(id));
          }}
          onThread={openThread}
        />
      }
      lead={channel?.kind === "direct" ? <Avatar name={channel.name} size="sm" /> : <Icon icon={ChannelIcon} size="sm" />}
      title={place}
      subtitle={channel?.topic ?? ""}
      stream={
        <Lines
          lines={stream}
          threadLabel={label}
          onThread={(m) => {
            const t = threads.find((x) => x.id === m.thread);
            if (t !== undefined) openThread(t, open.id);
          }}
        />
      }
      composer={
        <Card variant="muted" padding={3}>
          <Text type="supporting" color="secondary">
            {who} only speaks where it is asked. Write @{who} in a message, and its answer comes in a thread.
          </Text>
        </Card>
      }
      thread={
        shown !== undefined && root?.kind === "msg" ? (
          <Sender
            manager={manager}
            thread={shown.id}
            t={{
              name: shown.name,
              forkedAt: clock.time(shown.at),
              work: shown.work === null ? null : { id: shown.work, to: `/m/${manager}/work/${shown.work}` },
              how: shown.how,
            }}
            place={place}
            root={root}
            above={above}
            replies={linesOf(shown.replies, say, zone)}
            who={who}
            mode={modes[shown.id] ?? "tell"}
            onMode={(m) => setModes((was) => ({ ...was, [shown.id]: m }))}
            isYours={false}
            onClose={() => onThread(null)}
          />
        ) : null
      }
      isThreadOpen={shown !== undefined}
      onThreadOpenChange={(o) => {
        if (!o) onThread(null);
      }}
    />
  );
}

export default function SlackPage({ manager }: { readonly manager: string }) {
  const shell = useRead("/shell");
  const [channel, setChannel] = useState<string | undefined>(undefined);
  const [thread, setThread] = useState<string | null | undefined>(undefined);
  if (shell._tag !== "Ok") return null;
  const { coworker, workspace } = shell.value;
  return (
    <Reading
      from="/m/:manager/connectors/slack?channel"
      parts={{ manager, ...(channel === undefined ? {} : { channel }) }}
      failed="We could not read this Slack"
    >
      {(view) => (
        <Slack
          manager={manager}
          view={view}
          who={coworker.name}
          zone={workspace.zone}
          thread={thread}
          onChannel={(c, t) => {
            setChannel(c);
            setThread(t);
          }}
          onThread={setThread}
        />
      )}
    </Reading>
  );
}

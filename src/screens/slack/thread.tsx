import { Avatar } from "@astryxdesign/core/Avatar";
import { Button } from "@astryxdesign/core/Button";
import { Divider } from "@astryxdesign/core/Divider";
import { Icon } from "@astryxdesign/core/Icon";
import { IconButton } from "@astryxdesign/core/IconButton";
import { HStack, Layout, LayoutContent, LayoutFooter, LayoutHeader, StackItem, VStack } from "@astryxdesign/core/Layout";
import { Heading, Text } from "@astryxdesign/core/Text";
import { XMarkIcon as CloseIcon } from "@heroicons/react/24/outline";
import { useGo } from "~/modules/page/service.ts";
import { SendBox, Yours } from "../whatsapp/send-box.tsx";
import type { Line, Mode, Msg } from "../whatsapp/types.ts";

/** What the panel says of the thread: where it was forked from, and the pages it leads to. */
export interface Forked {
  readonly name: string;
  readonly forkedAt: string;
  readonly work: { readonly id: string; readonly to: string } | null;
  readonly how: string | null;
}

function Row({ l, who }: { l: Line; who: string }) {
  if (l.kind === "note")
    return (
      <Text type="supporting" color="secondary">
        {l.text}
      </Text>
    );
  const name = l.side === "me" ? who : (l.name ?? "");
  return (
    <HStack gap={2} vAlign="start">
      <Avatar name={name} size="sm" />
      <StackItem size="fill">
        <VStack gap={0.5}>
          <HStack gap={2} vAlign="center" wrap="wrap">
            <Text type="body" weight="bold">
              {name}
            </Text>
            <Text type="supporting" color="secondary">
              {l.time}
            </Text>
            {l.by && l.by !== who ? (
              <Text type="supporting" color="secondary">
                {l.by}
              </Text>
            ) : null}
          </HStack>
          <Text type="body">{l.text}</Text>
        </VStack>
      </StackItem>
    </HStack>
  );
}

/** The thread panel: what the thread is, its root, its replies, and the two-way box. */
export function ThreadView({
  t,
  place,
  root,
  above,
  replies,
  who,
  mode,
  onMode,
  isYours,
  onSend,
  onHandBack,
  onClose,
}: {
  t: Forked;
  place: string;
  root: Msg;
  above: number;
  replies: readonly Line[];
  who: string;
  mode: Mode;
  onMode: (m: Mode) => void;
  isYours: boolean;
  onSend: (text: string) => void;
  onHandBack: () => void;
  onClose: () => void;
}) {
  const go = useGo();
  return (
    <Layout
      height="fill"
      header={
        <LayoutHeader hasDivider padding={3}>
          <HStack gap={2} vAlign="center">
            <StackItem size="fill">
              <VStack gap={0}>
                <Heading level={4}>{t.name}</Heading>
                <Text type="supporting" color="secondary" maxLines={1}>
                  {place}
                </Text>
              </VStack>
            </StackItem>
            {isYours ? <Yours onBack={onHandBack} /> : null}
            <IconButton
              label="Close thread"
              tooltip="Close thread"
              icon={<Icon icon={CloseIcon} size="sm" color="inherit" />}
              variant="ghost"
              size="sm"
              onClick={onClose}
            />
          </HStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent padding={3}>
          <VStack gap={4}>
            <VStack gap={1}>
              <Text type="supporting" color="secondary">
                {`Its own agent, forked from ${place} at ${t.forkedAt}. It knows the ${above} message${above === 1 ? "" : "s"} above, and nothing said there since.`}
              </Text>
              {t.work !== null || t.how !== null ? (
                <HStack gap={1} wrap="wrap">
                  {t.work !== null ? <Button label={t.work.id} variant="secondary" size="sm" onClick={() => go(t.work?.to ?? "")} /> : null}
                  {t.how !== null ? <Button label="How it got here" variant="ghost" size="sm" onClick={() => go(t.how ?? "")} /> : null}
                </HStack>
              ) : null}
            </VStack>
            <Row l={root} who={who} />
            <Divider />
            {replies.map((r) => (
              <Row key={r.id} l={r} who={who} />
            ))}
          </VStack>
        </LayoutContent>
      }
      footer={
        <LayoutFooter padding={3}>
          <SendBox who={who} mode={mode} onMode={onMode} onSend={onSend} about="thread" />
        </LayoutFooter>
      }
    />
  );
}

import type { RefObject } from "react";
import { Card, HStack, Section, StackItem, VStack } from "@astryxdesign/core/Layout";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Avatar } from "@astryxdesign/core/Avatar";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Icon } from "@astryxdesign/core/Icon";
import { Link } from "@astryxdesign/core/Link";
import type { ChatComposerInputHandle } from "@astryxdesign/core/Chat";
import { ArrowDownLeftIcon, ArrowUpRightIcon, ChatBubbleLeftIcon, EnvelopeIcon, PencilSquareIcon } from "@heroicons/react/24/outline";
import { go } from "../../shell";
import { STAGES, whenOf } from "./data";
import type { Deal, Entry, Told } from "./data";
import { DealComposer } from "./composer";
import type { Mode } from "./composer";
import { Bullet } from "./header";

const Line = ({ icon, children }: { icon: typeof EnvelopeIcon; children: string }) => (
  <HStack gap={2} vAlign="center"><Icon icon={icon} size="sm" color="secondary" /><Text type="supporting" color="secondary">{children}</Text></HStack>
);

function EntryRow({ entry }: { entry: Entry }) {
  const isIn = entry.dir === "in";
  return (
    <HStack gap={3} vAlign="start">
      <Avatar name={entry.who} size="md" />
      <StackItem size="fill">
        <VStack gap={2}>
          <Card variant="muted" padding={3}>
            <VStack gap={1}>
              <Text type="body" weight="bold">{entry.who}</Text>
              <Text type="body">{entry.text}</Text>
              {entry.mail && <Line icon={EnvelopeIcon}>{entry.mail.subject}</Line>}
              {entry.note && <Line icon={PencilSquareIcon}>{entry.note}</Line>}
            </VStack>
          </Card>
          <HStack gap={2} vAlign="center" wrap="wrap">
            <HStack gap={1} vAlign="center">
              <Icon icon={isIn ? ArrowDownLeftIcon : ArrowUpRightIcon} size="xsm" color="secondary" />
              <Text type="supporting" color="secondary">{isIn ? "Received" : "Delivered"}</Text>
            </HStack>
            <Bullet />
            <Text type="supporting" color="secondary" hasTabularNumbers>{whenOf(entry.at) === entry.at ? entry.at : `Today, ${whenOf(entry.at)}`}</Text>
            {entry.became && (
              <>
                <Bullet />
                <Link href="#task" type="supporting" color="secondary" onClick={(e) => { e.preventDefault(); go("soon-Task"); }}>{`Became ${entry.became}`}</Link>
              </>
            )}
          </HStack>
        </VStack>
      </StackItem>
    </HStack>
  );
}

/** What you told Sales is not in the CRM, so it is one quiet line. */
function ToldRow({ told }: { told: Told }) {
  return (
    <HStack gap={2} vAlign="center" hAlign="center" wrap="wrap">
      <Icon icon={ChatBubbleLeftIcon} size="sm" color="secondary" />
      <Text type="supporting" color="secondary">{`You told Sales: ${told.text}`}</Text>
      <Text type="supporting" color="secondary" hasTabularNumbers>{`Today, ${whenOf(told.at)}`}</Text>
    </HStack>
  );
}

export function TimelineSection({ deal, onAnswer, mode, onMode, onSend, inputRef }: {
  deal: Deal; onAnswer: (yes: boolean) => void; mode: Mode; onMode: (m: Mode) => void; onSend: (text: string) => void; inputRef: RefObject<ChatComposerInputHandle | null>;
}) {
  return (
    <Section>
      <VStack gap={4}>
        <Heading level={2}>Timeline</Heading>
        <VStack gap={4}>
          {deal.events.map((ev) => (ev.kind === "entry" ? <EntryRow key={ev.id} entry={ev} /> : <ToldRow key={ev.id} told={ev} />))}
        </VStack>
        {deal.pending && (
          <Banner
            status="info"
            title={`Sales wants to move this to ${STAGES[deal.pending].label}`}
            description="Sales asks before it moves a stage. Nothing changes until you answer."
            endContent={
              <HStack gap={2}>
                <Button label="Yes" variant="primary" onClick={() => onAnswer(true)} />
                <Button label="No" variant="secondary" onClick={() => onAnswer(false)} />
              </HStack>
            }
          />
        )}
        <DealComposer mode={mode} onMode={onMode} onSend={onSend} inputRef={inputRef} />
      </VStack>
    </Section>
  );
}

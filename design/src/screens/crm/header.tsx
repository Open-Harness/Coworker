import { HStack, LayoutHeader, StackItem, VStack } from "@astryxdesign/core/Layout";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Avatar } from "@astryxdesign/core/Avatar";
import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { Icon } from "@astryxdesign/core/Icon";
import { Link } from "@astryxdesign/core/Link";
import { Tab, TabList } from "@astryxdesign/core/TabList";
import { rtlStyles } from "@astryxdesign/core/utils";
import { ArrowLeftIcon, CalendarIcon, FlagIcon, ViewColumnsIcon } from "@heroicons/react/24/outline";
import { go } from "../../shell";
import { lastOf, money, STAGES, valueOf, whenOf } from "./data";
import type { Deal } from "./data";

export type TabId = "details" | "timeline" | "mail";

export function Bullet() {
  return <Text type="supporting" color="secondary">{"・"}</Text>;
}

/** Why this deal wants attention, if it does. */
const flagOf = (d: Deal): string | null => (d.pending ? "Waits for your yes" : d.waiting ? "Waiting for us" : null);

export function DealHeader({ deal, tab, onTab, isPanelOpen, onTogglePanel, isNarrow, onBack, onWrite }: {
  deal: Deal; tab: TabId; onTab: (t: TabId) => void; isPanelOpen: boolean; onTogglePanel: () => void; isNarrow: boolean;
  onBack: () => void; onWrite: (mode: "tell" | "note") => void;
}) {
  const last = lastOf(deal);
  const flag = flagOf(deal);
  const actions = (
    <>
      <Button label="Tell Sales" variant="secondary" onClick={() => onWrite("tell")} />
      <Button label="Write a note" variant="secondary" onClick={() => onWrite("note")} />
    </>
  );
  return (
    <LayoutHeader hasDivider padding={4} paddingBlockEnd={0}>
      <VStack gap={3}>
        <HStack gap={4} vAlign="start">
          <StackItem size="fill">
            <VStack gap={0}>
              <Link href="#" color="secondary" onClick={(e) => { e.preventDefault(); onBack(); }}>
                <HStack gap={1} vAlign="center">
                  <Icon icon={ArrowLeftIcon} size="sm" color="inherit" xstyle={rtlStyles.mirror} />
                  All deals
                </HStack>
              </Link>
              <VStack gap={0}>
                <Heading level={1} maxLines={1}>{deal.name}</Heading>
                <HStack gap={1} vAlign="center" wrap="wrap">
                  <Text type="body" maxLines={1}>{deal.company}</Text>
                  <HStack gap={1} vAlign="center"><Bullet /><Text type="body" weight="semibold" maxLines={1} hasTabularNumbers>{money(valueOf(deal))}</Text></HStack>
                  <HStack gap={1} vAlign="center">
                    <Bullet />
                    {deal.owner === "Sales" ? null : <Avatar name={deal.owner} size="sm" />}
                    <Text type="body" maxLines={1}>{deal.owner}</Text>
                  </HStack>
                  <HStack gap={1} vAlign="center"><Bullet /><Badge variant={STAGES[deal.stage].tone} label={STAGES[deal.stage].label} /></HStack>
                  <HStack gap={1} vAlign="center">
                    <Bullet />
                    <Icon icon={CalendarIcon} size="sm" color="secondary" />
                    <Text type="body" maxLines={1} hasTabularNumbers>{whenOf(last.at)}</Text>
                  </HStack>
                  {flag && (
                    <HStack gap={1} vAlign="center"><Bullet /><Icon icon={FlagIcon} size="sm" color="secondary" /><Text type="body" maxLines={1}>{flag}</Text></HStack>
                  )}
                  {deal.work && (
                    <HStack gap={1} vAlign="center"><Bullet /><Link href="#task" color="secondary" onClick={(e) => { e.preventDefault(); go("soon-Task"); }}>{deal.work}</Link></HStack>
                  )}
                </HStack>
              </VStack>
            </VStack>
          </StackItem>
          {!isNarrow && <HStack gap={2}>{actions}</HStack>}
        </HStack>
        {isNarrow && <HStack gap={2} wrap="wrap">{actions}</HStack>}

        <HStack vAlign="center">
          <StackItem size="fill">
            <TabList value={tab} onChange={(v) => onTab(v as TabId)} size="lg" isFullBleed>
              <Tab value="details" label="Details" />
              <Tab value="timeline" label="Timeline" />
              <Tab value="mail" label="Mail" />
            </TabList>
          </StackItem>
          {!isNarrow && (
            <Button label={isPanelOpen ? "Hide panel" : "Show panel"} variant="ghost" size="md" icon={<Icon icon={ViewColumnsIcon} size="sm" />} isIconOnly onClick={onTogglePanel} />
          )}
        </HStack>
      </VStack>
    </LayoutHeader>
  );
}

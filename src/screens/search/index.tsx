// astryx-template: detail-page
import { useState } from "react";
import { Avatar } from "@astryxdesign/core/Avatar";
import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import { Icon } from "@astryxdesign/core/Icon";
import { HStack, Layout, LayoutContent, LayoutHeader, LayoutPanel, StackItem, VStack } from "@astryxdesign/core/Layout";
import { Link } from "@astryxdesign/core/Link";
import { Tab, TabList } from "@astryxdesign/core/TabList";
import { Heading, Text } from "@astryxdesign/core/Text";
import { useToast } from "@astryxdesign/core/Toast";
import { rtlStyles } from "@astryxdesign/core/utils";
import { ArrowLeftIcon, CalendarIcon, ViewColumnsIcon } from "@heroicons/react/24/outline";
import { Reading, useApi, useBrowser, useClock, useGo, useHref, useRead } from "~/modules/page/service.ts";
import type { PageProps } from "~/modules/page/types.ts";
import type { TriggerView } from "~/modules/views-manager/types.ts";
import { cadence, nearDay, useZone } from "../manager-frame/words.ts";
import { PanelContent } from "./panel.tsx";
import { Does, Found, Runs } from "./parts.tsx";

type At = "found" | "does" | "runs";
const Bullet = () => (
  <Text type="supporting" color="secondary">
    {"・"}
  </Text>
);

/** One trigger: when, who, what it looks at and for. What it finds goes through Intake like anything else. */
function Trigger({ view, manager, name }: { readonly view: TriggerView; readonly manager: string; readonly name: string }) {
  const showToast = useToast();
  const [api, { newId }, go, href, clock, zone] = [useApi(), useBrowser(), useGo(), useHref(), useClock(), useZone()];
  const [tab, setTab] = useState<At>("found");
  const [showPanel, setShowPanel] = useState(true);
  const isNarrow = useMediaQuery("(max-width: 1024px)", true);
  const { trigger, next } = view.row;
  const waiting = view.found.find((one) => one.waits);
  const waits = view.found.filter((one) => one.waits).length;
  const run = async () => {
    const did = await api.write("/do", { doing: "trigger.run", values: { manager, trigger: trigger.id }, key: newId() });
    showToast({
      body: did._tag === "Ok" ? "Running. What it finds comes in under Intake." : `That did not go through. ${did.says}`,
      uniqueID: "run",
    });
  };
  const actions = (
    <>
      <Button label="Run it now" variant="secondary" onClick={() => void run()} />
      <Button label="Change" variant="secondary" onClick={() => go("/")} />
    </>
  );
  const possessive = name.endsWith("s") ? `${name}’` : `${name}’s`;
  return (
    <Layout
      height="fill"
      contentWidth={1440}
      defaultHasDividers
      header={
        <LayoutHeader hasDivider padding={4} paddingBlockEnd={0}>
          <VStack gap={3}>
            <HStack gap={4} vAlign="start">
              <StackItem size="fill">
                <VStack gap={0}>
                  <Link href={href(`/m/${manager}/playbook/triggers`)} color="secondary">
                    <HStack gap={1} vAlign="center">
                      <Icon icon={ArrowLeftIcon} size="sm" color="inherit" xstyle={rtlStyles.mirror} />
                      {`${possessive} triggers`}
                    </HStack>
                  </Link>
                  <Heading level={1} maxLines={1}>
                    {trigger.name}
                  </Heading>
                  <HStack gap={1} vAlign="center" wrap="wrap">
                    {trigger.by !== "cron" ? null : (
                      <HStack gap={1} vAlign="center">
                        <Icon icon={CalendarIcon} size="sm" color="secondary" />
                        <Text type="body" maxLines={1}>
                          {cadence(trigger.when.cron)}
                        </Text>
                      </HStack>
                    )}
                    <HStack gap={1} vAlign="center">
                      <Bullet />
                      <Avatar name={view.agentName} size="sm" />
                      <Text type="body" maxLines={1}>
                        {view.agentName}
                      </Text>
                    </HStack>
                    {view.looksAt === null ? null : (
                      <HStack gap={1} vAlign="center">
                        <Bullet />
                        <Text type="body" maxLines={1}>{`${view.looksAt.count} ${view.looksAt.noun}`}</Text>
                      </HStack>
                    )}
                    {waiting === undefined ? null : (
                      <HStack gap={1} vAlign="center">
                        <Bullet />
                        <Badge variant="warning" label={`${waits} ${waiting.became.replace(/^\w/u, (one) => one.toLowerCase())}`} />
                      </HStack>
                    )}
                    {next === null ? null : (
                      <HStack gap={1} vAlign="center">
                        <Bullet />
                        <Text type="body" maxLines={1}>{`Next run ${nearDay(next, clock.now(), zone)}`}</Text>
                      </HStack>
                    )}
                  </HStack>
                </VStack>
              </StackItem>
              {!isNarrow && <HStack gap={2}>{actions}</HStack>}
            </HStack>
            {isNarrow && (
              <HStack gap={2} wrap="wrap">
                {actions}
              </HStack>
            )}
            <HStack vAlign="center">
              <StackItem size="fill">
                <TabList value={tab} onChange={(next) => setTab(next as At)} size="lg" isFullBleed>
                  <Tab value="found" label="Found" />
                  <Tab value="does" label="What it does" />
                  <Tab value="runs" label="Runs" />
                </TabList>
              </StackItem>
              {!isNarrow && (
                <Button
                  label={showPanel ? "Hide panel" : "Show panel"}
                  variant="ghost"
                  icon={<Icon icon={ViewColumnsIcon} size="sm" />}
                  isIconOnly
                  onClick={() => setShowPanel((one) => !one)}
                />
              )}
            </HStack>
          </VStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent role="main">
          <VStack gap={4}>
            {tab === "found" ? <Found view={view} manager={manager} /> : tab === "does" ? <Does view={view} /> : <Runs view={view} />}
            {isNarrow && (
              <VStack gap={4}>
                <Heading level={2}>About this trigger</Heading>
                <PanelContent view={view} manager={manager} sectionLevel={3} />
              </VStack>
            )}
          </VStack>
        </LayoutContent>
      }
      end={
        !isNarrow && showPanel ? (
          <LayoutPanel width={320} padding={4} role="complementary">
            <PanelContent view={view} manager={manager} />
          </LayoutPanel>
        ) : undefined
      }
    />
  );
}

export default function SearchPage({ params }: PageProps) {
  const manager = params["manager"] ?? "";
  const shell = useRead("/shell");
  const name = shell._tag === "Ok" ? (shell.value.tree.find((one) => one.id === manager)?.name ?? manager) : manager;
  return (
    <Reading
      from="/m/:manager/triggers/:trigger"
      parts={params}
      failed="We could not read this trigger"
      gone={{ title: "This trigger is not here" }}
    >
      {(view) => <Trigger view={view} manager={manager} name={name} />}
    </Reading>
  );
}

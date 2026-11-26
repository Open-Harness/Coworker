// astryx-template: shell-side-nav
import type { ReactNode } from "react";
import { Layout, LayoutContent, LayoutHeader } from "@astryxdesign/core/Layout";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { Tab, TabList } from "@astryxdesign/core/TabList";
import { Heading, Text } from "@astryxdesign/core/Text";
import { DOT } from "~/juno/nav.tsx";
import { useGo, useRead } from "~/modules/page/service.ts";

export const TABS = ["Overview", "Intake", "Board", "Playbook", "Connectors", "Threads", "Settings"] as const;
export type TabName = (typeof TABS)[number];
const slug = (tab: TabName): string => (tab === "Overview" ? "" : `/${tab.toLowerCase()}`);

/** A manager's header, the same on each of its pages: name, one line of status, tabs. The page fills what is left. */
export function ManagerFrame({ id, tab, children }: { readonly id: string; readonly tab: TabName; readonly children: ReactNode }) {
  const go = useGo();
  const shell = useRead("/shell");
  const node = shell._tag === "Ok" ? shell.value.tree.find((one) => one.id === id) : undefined;
  return (
    <Layout
      height="fill"
      header={
        <LayoutHeader hasDivider={false} paddingBlockEnd={0}>
          <VStack gap={2}>
            <HStack gap={3} vAlign="center" wrap="wrap">
              <Heading level={1}>{node?.name ?? id}</Heading>
              {node === undefined ? null : (
                <HStack gap={1.5} vAlign="center">
                  <StatusDot variant={DOT[node.is].variant} label={DOT[node.is].label} />
                  <Text type="supporting" color="secondary">
                    {node.now}
                  </Text>
                </HStack>
              )}
            </HStack>
            <TabList value={tab} onChange={(next) => go(`/m/${id}${slug(next as TabName)}`)} hasDivider isFullBleed>
              {TABS.map((one) => (
                <Tab key={one} value={one} label={one} />
              ))}
            </TabList>
          </VStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent padding={0} isScrollable={false}>
          {children}
        </LayoutContent>
      }
    />
  );
}

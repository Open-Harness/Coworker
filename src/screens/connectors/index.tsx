// astryx-template: messaging-shell
/* A manager's connectors: one switch, then the view the connector brings. All is every event of every connector, oldest machinery last. */
import { lazy, Suspense, type ComponentType } from "react";
import { Center } from "@astryxdesign/core/Center";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { HStack, Layout, LayoutContent, LayoutHeader, StackItem } from "@astryxdesign/core/Layout";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { Text } from "@astryxdesign/core/Text";
import { Reading, useGo } from "~/modules/page/service.ts";
import { ManagerFrame } from "../manager-frame/frame.tsx";
import type { PageProps } from "~/modules/page/types.ts";

type View = ComponentType<{ readonly manager: string }>;
/** The connectors that have a view of their own, by the rule that picks the first: where the record is kept, then mail, then chat. */
const VIEWS: readonly (readonly [string, View])[] = [
  ["crm", lazy(() => import("../crm/view.tsx"))],
  ["github", lazy(() => import("../github/view.tsx"))],
  ["email", lazy(() => import("../email/view.tsx"))],
  ["slack", lazy(() => import("../slack/view.tsx"))],
  ["whatsapp", lazy(() => import("../whatsapp/view.tsx"))],
];

/** A manager's connectors: the switch, which one is on and how it is, and the view the connector brings. */
export default function ConnectorsPage({ params }: PageProps) {
  const [manager, which] = [params["manager"] ?? "", params["connector"]];
  const go = useGo();
  return (
    <Reading from="/m/:manager" parts={{ manager }} failed="We could not read this manager's connectors">
      {({ connectors }) => {
        const first = VIEWS.find(([id]) => connectors.some((c) => c.id === id))?.[0] ?? connectors[0]?.id;
        const at = which === "all" ? undefined : connectors.find((c) => c.id === (which ?? first));
        const view = at === undefined ? undefined : VIEWS.find(([id]) => id === at.id)?.[1];
        const Connector = view;
        return (
          <ManagerFrame id={manager} tab="Connectors">
            <Layout
              height="fill"
              header={
                <LayoutHeader hasDivider padding={4} paddingBlockEnd={3}>
                  <HStack gap={3} vAlign="center" wrap="wrap">
                    <SegmentedControl label="Connector" value={at?.id ?? "all"} onChange={(v) => go(`/m/${manager}/connectors/${v}`)}>
                      <SegmentedControlItem value="all" label="All" />
                      {connectors.map((c) => (
                        <SegmentedControlItem key={c.id} value={c.id} label={c.name} />
                      ))}
                    </SegmentedControl>
                    <StackItem size="fill" />
                    {at === undefined ? null : (
                      <HStack gap={1.5} vAlign="center">
                        <StatusDot variant={at.works ? "success" : "error"} label={at.works ? "Connected" : "Offline"} />
                        <Text type="supporting" color="secondary">
                          {at.works ? at.as : `${at.as}, ${at.says}`}
                        </Text>
                      </HStack>
                    )}
                  </HStack>
                </LayoutHeader>
              }
              content={
                <LayoutContent padding={0} isScrollable={false}>
                  {Connector !== undefined ? (
                    <Suspense
                      fallback={
                        <Center axis="both" height="100%">
                          <Text type="supporting" color="secondary">
                            Opening
                          </Text>
                        </Center>
                      }
                    >
                      <Connector manager={manager} />
                    </Suspense>
                  ) : (
                    <Center axis="both" height="100%">
                      <EmptyState title={at === undefined ? "Every connector" : at.name} description="Nothing to show here yet." />
                    </Center>
                  )}
                </LayoutContent>
              }
            />
          </ManagerFrame>
        );
      }}
    </Reading>
  );
}

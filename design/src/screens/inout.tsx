/* A manager's connectors: one switch, then the view the connector brings. All is every event of every connector, oldest machinery last. */
import { lazy, Suspense, type ComponentType } from "react";
import { Center } from "@astryxdesign/core/Center";
import { Divider } from "@astryxdesign/core/Divider";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { HStack, Layout, LayoutContent, LayoutHeader, StackItem } from "@astryxdesign/core/Layout";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { Text } from "@astryxdesign/core/Text";
import { go } from "../shell";
import { manager } from "../world";

type View = ComponentType<{ manager: string }>;
const VIEWS: Readonly<Record<string, View>> = {
  WhatsApp: lazy(() => import("./whatsapp/index")), Slack: lazy(() => import("./slack/index")),
  Email: lazy(() => import("./email/index")), CRM: lazy(() => import("./crm/index")), GitHub: lazy(() => import("./github/index")),
};
const ACCOUNT: Readonly<Record<string, string>> = { WhatsApp: "+44 7700 900123", Slack: "acme.slack.com", Email: "juno@acme.co-worker.tech", CRM: "Acme’s CRM", Calendar: "Bo’s calendar", GitHub: "acme/web" };
/** The connectors whose view is drawn for this manager. */
const DRAWN: Readonly<Record<string, readonly string[]>> = { whatsapp: ["WhatsApp"], coding: ["GitHub", "Slack"], support: ["Email", "WhatsApp"], sales: ["CRM"] };

export function InOut({ id, which }: { id: string; which: string | undefined }) {
  const m = manager(id);
  const names = m.connectors;
  const first = DRAWN[id]?.[0] ?? names[0];
  const at = names.find((n) => n.toLowerCase() === which) ?? (which === "all" ? "All" : first) ?? "All";
  const V = DRAWN[id]?.includes(at) ? VIEWS[at] : undefined;
  const isOff = at === "WhatsApp";
  return (
    <Layout height="fill"
      header={
        <LayoutHeader hasDivider padding={4} paddingBlockEnd={3}>
          <HStack gap={3} vAlign="center" wrap="wrap">
            <SegmentedControl label="Connector" value={at} onChange={(v) => go(`m-${id}-connectors-${v.toLowerCase()}`)}>
              {["All", ...names].map((n) => <SegmentedControlItem key={n} value={n} label={n} />)}
            </SegmentedControl>
            <StackItem size="fill"><span /></StackItem>
            {at !== "All" && <HStack gap={1.5} vAlign="center"><StatusDot variant={isOff ? "error" : "success"} label={isOff ? "Offline" : "Connected"} /><Text type="supporting" color="secondary">{ACCOUNT[at]}{isOff ? ", offline since 08:10" : ""}</Text></HStack>}
          </HStack>
        </LayoutHeader>
      }
      content={<LayoutContent padding={0} isScrollable={false}>
        {V ? <Suspense fallback={<Center axis="both" height="100%"><Text type="supporting" color="secondary">Opening</Text></Center>}><V manager={id} /></Suspense>
          : <Center axis="both" height="100%"><EmptyState title={at === "All" ? "Every connector" : at} description="Not drawn yet." /></Center>}
      </LayoutContent>}
    />
  );
}

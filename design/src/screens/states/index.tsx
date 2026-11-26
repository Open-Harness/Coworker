// astryx-template: empty-state
import { useEffect, useState, type ReactNode } from "react";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Center } from "@astryxdesign/core/Center";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Icon } from "@astryxdesign/core/Icon";
import { Grid } from "@astryxdesign/core/Grid";
import { HStack, Layout, LayoutContent, VStack } from "@astryxdesign/core/Layout";
import { Skeleton } from "@astryxdesign/core/Skeleton";
import { Heading, Text } from "@astryxdesign/core/Text";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import { Table, proportional, type TableColumn } from "@astryxdesign/core/Table";
import { InboxIcon, NoSymbolIcon } from "@heroicons/react/24/outline";
import { go, ManagerFrame, Shell } from "../../shell";
import { LANES } from "../../world";
import Board from "../board";

/** How a screen looks before it has data (loading), when it could not be read (error), when there is nothing yet (empty),
 *  when a number is not yet readable (notyet), when the connection is lost (offline), and when a thing is gone or not yours (gone). */
const STATES = ["loading", "error", "empty", "notyet", "offline", "gone"] as const;
type Which = (typeof STATES)[number];
const which = (h: string): Which => STATES.find((s) => h === `state-${s}`) ?? "loading";

const SIX = ["Came in", "Became work", "Sent back", "Median time", "Waiting on people", "What it cost"] as const;

/** Loading: the board keeps its five steps, and each holds the shape of a card. */
function Loading() {
  const isNarrow = useMediaQuery("(max-width: 768px)");
  return (
    <HStack gap={3} padding={4} vAlign="start" {...(isNarrow ? {} : {})}>
      {LANES.slice(0, isNarrow ? 1 : 5).map((l) => (
        <VStack key={l.id} gap={3} style={{ flex: 1, minWidth: 0 }}>
          <Text type="body" weight="semibold">{l.name}</Text>
          {[0, 1].map((i) => <Card key={i} padding={3}><VStack gap={2}><Skeleton width="40%" height={12} /><Skeleton width="90%" height={14} /><Skeleton width="70%" height={12} /></VStack></Card>)}
        </VStack>
      ))}
    </HStack>
  );
}

/** Error: the tiles that could not be read say so, and the one thing to do is to try again. Nothing stands in for a number. */
function Failed() {
  return (
    <VStack gap={4} padding={4}>
      <Banner status="error" title="We could not read the last 7 days" description="Nothing is lost. It did not answer at 09:54."
        endContent={<Button label="Try again" size="sm" variant="secondary" onClick={() => location.reload()} />} />
      <Grid columns={{ minWidth: 200, max: 3 }} gap={4}>
        {SIX.map((l) => <Card key={l} padding={4}><VStack gap={1}><Text type="supporting" color="secondary">{l}</Text><Text type="body" color="secondary">Could not be read</Text></VStack></Card>)}
      </Grid>
    </VStack>
  );
}

/** Not yet: a number that cannot be read yet says Not yet, and when it will be. A small thing in a full page. */
function NotYet() {
  const tiles = [["Came in", "11", "Today, 09:54"], ["Became work", "3", "Today, 09:54"], ["Sent back", "Not yet", "First read on Monday, 07:00"], ["Median time", "20 hours", "Today, 09:54"], ["Waiting on people", "1", "Today, 09:54"], ["What it cost", "$9", "Today, 09:54"]] as const;
  return (
    <VStack gap={4} padding={4}>
      <Text type="supporting" color="secondary">Releases is new. It has made one release, and some numbers need more than one to mean anything.</Text>
      <Grid columns={{ minWidth: 200, max: 3 }} gap={4}>
        {tiles.map(([l, v, w]) => <Card key={l} padding={4}><VStack gap={1}><Text type="supporting" color="secondary">{l}</Text><Heading level={2} color={v === "Not yet" ? "secondary" : "primary"}>{v}</Heading><Text type="supporting" color="secondary">{w}</Text></VStack></Card>)}
      </Grid>
    </VStack>
  );
}

interface Row extends Record<string, unknown> { id: string }
const HEAD: TableColumn<Row>[] = ["What came in", "From", "What Docs decided", "When"].map((h, i) => ({ key: String(i), header: h, width: proportional(1, { minWidth: 120 }), renderCell: () => null }));

/** Empty: what will be here, and the one thing to do. The table keeps its columns. */
function Empty() {
  const isNarrow = useMediaQuery("(max-width: 768px)");
  const none = <Center axis="both" minHeight={320}><EmptyState icon={<Icon icon={InboxIcon} size="lg" />} title="Nothing has come in yet" description="When something is merged on acme/web, it shows here, with what Docs decided about it and why." actions={<Button label="See what makes it start" variant="secondary" onClick={() => go("m-docs-playbook-triggers")} />} /></Center>;
  return <Table<Row> data={[]} columns={isNarrow ? HEAD.slice(0, 2) : HEAD} idKey="id" density="balanced" dividers="rows" emptyState={none} />;
}

function Gone() {
  return <Center axis="both" height="100%"><EmptyState icon={<Icon icon={NoSymbolIcon} size="lg" />} title="ACME-377 is not here" description="It was removed, or it belongs to a workspace you are not in. Nothing else is wrong." actions={<HStack gap={2}><Button label="Go to Coding" variant="primary" onClick={() => go("m-coding-overview")} /><Button label="Ask Juno" variant="secondary" onClick={() => go("home")} /></HStack>} /></Center>;
}

function Offline() {
  return (
    <VStack gap={0} height="100%">
      <Banner container="section" status="error" title="You are offline" description="This is how it was at 09:51. What you change waits here, and goes when the connection is back." />
      <div style={{ flex: 1, minHeight: 0, opacity: 0.6 }} aria-disabled><Board /></div>
    </VStack>
  );
}

const framed = (id: string, tab: "Board" | "Overview" | "Intake", name: string, body: ReactNode) => <Shell at={id} place={name}><ManagerFrame id={id} tab={tab}>{body}</ManagerFrame></Shell>;

export default function States() {
  const [h, setH] = useState(location.hash.slice(1));
  useEffect(() => { const on = () => setH(location.hash.slice(1)); addEventListener("hashchange", on); return () => removeEventListener("hashchange", on); }, []);
  const s = which(h);
  const scroll = (body: ReactNode) => <Layout height="fill" content={<LayoutContent padding={0}>{body}</LayoutContent>} />;
  if (s === "loading") return framed("coding", "Board", "Coding", scroll(<Loading />));
  if (s === "error") return framed("coding", "Overview", "Coding", scroll(<Failed />));
  if (s === "empty") return framed("docs", "Intake", "Docs", <Empty />);
  if (s === "notyet") return framed("releases", "Overview", "Releases", scroll(<NotYet />));
  if (s === "offline") return framed("coding", "Board", "Coding", <Offline />);
  return <Shell at="coding" place="Coding"><Gone /></Shell>;
}

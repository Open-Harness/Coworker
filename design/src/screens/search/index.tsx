// astryx-template: detail-page
import { useState, type CSSProperties } from "react";
import { Avatar } from "@astryxdesign/core/Avatar";
import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { Collapsible } from "@astryxdesign/core/Collapsible";
import { Divider } from "@astryxdesign/core/Divider";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import { Icon } from "@astryxdesign/core/Icon";
import { HStack, Layout, LayoutContent, LayoutHeader, LayoutPanel, Section, StackItem, VStack } from "@astryxdesign/core/Layout";
import { Link } from "@astryxdesign/core/Link";
import { List, ListItem } from "@astryxdesign/core/List";
import { MetadataList, MetadataListItem } from "@astryxdesign/core/MetadataList";
import { ProgressBar } from "@astryxdesign/core/ProgressBar";
import { Tab, TabList } from "@astryxdesign/core/TabList";
import { Heading, Text } from "@astryxdesign/core/Text";
import { useToast } from "@astryxdesign/core/Toast";
import { rtlStyles } from "@astryxdesign/core/utils";
import { ArrowLeftIcon, CalendarIcon, ViewColumnsIcon } from "@heroicons/react/24/outline";
import { FOUND, RUNS, STEPS, TRIED } from "./data";

// List has no prop to line its text up with the heading above.
const itemsList: CSSProperties = { marginInline: -8 };
const Bullet = () => <Text type="supporting" color="secondary">{"・"}</Text>;
type At = "found" | "does" | "runs";

function Found() {
  return (
    <>
      <Section>
        <VStack gap={4}>
          <HStack vAlign="center" gap={2}><StackItem size="fill"><Heading level={2}>Found in 7 days</Heading></StackItem><Text type="supporting" color="secondary">6, of which 4 were taken on</Text></HStack>
          <List density="spacious" style={itemsList}>
            {FOUND.map((f) => <ListItem key={f.what} label={f.what} href={f.to} description={<VStack gap={0}><Text type="supporting" color="secondary">{f.sign}</Text><Text type="supporting" color="secondary">{f.source}</Text></VStack>} endContent={<VStack gap={0} hAlign="end"><Text type="body" weight={f.waits ? "bold" : "normal"} maxLines={1}>{f.became}</Text><Text type="supporting" color="secondary" maxLines={1}>{f.at}</Text></VStack>} />)}
          </List>
        </VStack>
      </Section>
    </>
  );
}
function Does() {
  return (
    <>
      <Section>
        <VStack gap={4}>
          <Heading level={2}>What it does each time</Heading>
          <List density="spacious" style={itemsList}>{STEPS.map(([what, who, note], i) => <ListItem key={what} label={`${i + 1}. ${what}`} description={note} endContent={<Text type="supporting" color="secondary">{who}</Text>} />)}</List>
        </VStack>
      </Section>
      <Section>
        <VStack gap={4}>
          <Heading level={2}>What it looks for</Heading>
          <Text type="body">A company on the list that opened a new site, or hired its first head of operations, in the last 30 days. Say where you read it. A single job advert is not a sign, and neither is raising money. If you cannot find the date, leave it out.</Text>
          <Divider />
          <MetadataList>
            <MetadataListItem label="Brings back">Company, sign, date, the page it was read on</MetadataListItem>
            <MetadataListItem label="Same again">Same company and same sign, within 60 days</MetadataListItem>
            <MetadataListItem label="Then">The playbook decides. A trigger never writes to anyone.</MetadataListItem>
          </MetadataList>
        </VStack>
      </Section>
    </>
  );
}
function Runs() {
  return (
    <Section>
      <VStack gap={4}>
        <Heading level={2}>Runs</Heading>
        <List density="spacious" style={itemsList}>{RUNS.map(([when, what, cost]) => <ListItem key={when} label={when} description={what} endContent={<Text type="body" hasTabularNumbers>{cost}</Text>} />)}</List>
      </VStack>
    </Section>
  );
}

function PanelContent({ sectionLevel = 2 }: { sectionLevel?: 2 | 3 }) {
  const title = (t: string) => <Heading level={4} accessibilityLevel={sectionLevel}>{t}</Heading>;
  return (
    <VStack gap={4}>
      <Collapsible trigger={title("When and what")}>
        <MetadataList>
          <MetadataListItem label="When">Weekdays, 08:30</MetadataListItem>
          <MetadataListItem label="Who">Researcher</MetadataListItem>
          <MetadataListItem label="Looks at">CRM list “Target accounts”, 140 companies</MetadataListItem>
          <MetadataListItem label="At most">10 a day</MetadataListItem>
          <MetadataListItem label="May">Read the web and the CRM</MetadataListItem>
          <MetadataListItem label="Becomes"><Link href="#m-sales-playbook-workflow">A sign at a company</Link></MetadataListItem>
        </MetadataList>
      </Collapsible>
      <Collapsible trigger={title("Why weekdays at 08:30")}>
        <VStack gap={3}>
          <Text type="body">Juno ran it over 30 past days, three ways.</Text>
          <MetadataList>{TRIED.map(([how, got]) => <MetadataListItem key={how} label={how}>{got}</MetadataListItem>)}</MetadataList>
        </VStack>
      </Collapsible>
      <Collapsible trigger={title("Spent this month")}>
        <VStack gap={1}><ProgressBar label="Spent this month" value={44} isLabelHidden /><Text type="body">$11 of $25. It stops at the limit and says so once.</Text></VStack>
      </Collapsible>
    </VStack>
  );
}

/** One trigger, a cron: when, who, what it looks at and for. What it finds goes through Intake like anything else. */
export default function Search() {
  const showToast = useToast();
  const [tab, setTab] = useState<At>("found");
  const [showPanel, setShowPanel] = useState(true);
  const isNarrow = useMediaQuery("(max-width: 1024px)", true);
  const actions = (
    <>
      <Button label="Run it now" variant="secondary" onClick={() => showToast({ body: "Running. What it finds comes in under Intake.", uniqueID: "run" })} />
      <Button label="Change" variant="secondary" onClick={() => { location.hash = "home"; }} />
    </>
  );
  return (
    <Layout height="fill" contentWidth={1440} defaultHasDividers
      header={
        <LayoutHeader hasDivider padding={4} paddingBlockEnd={0}>
          <VStack gap={3}>
            <HStack gap={4} vAlign="start">
              <StackItem size="fill">
                <VStack gap={0}>
                  <Link href="#m-sales-playbook-triggers" color="secondary"><HStack gap={1} vAlign="center"><Icon icon={ArrowLeftIcon} size="sm" color="inherit" xstyle={rtlStyles.mirror} />Sales’ triggers</HStack></Link>
                  <Heading level={1} maxLines={1}>Look for signs</Heading>
                  <HStack gap={1} vAlign="center" wrap="wrap">
                    <HStack gap={1} vAlign="center"><Icon icon={CalendarIcon} size="sm" color="secondary" /><Text type="body" maxLines={1}>Weekdays, 08:30</Text></HStack>
                    <HStack gap={1} vAlign="center"><Bullet /><Avatar name="Researcher" size="sm" /><Text type="body" maxLines={1}>Researcher</Text></HStack>
                    <HStack gap={1} vAlign="center"><Bullet /><Text type="body" maxLines={1}>140 companies</Text></HStack>
                    <HStack gap={1} vAlign="center"><Bullet /><Badge variant="warning" label="1 waits for Bo" /></HStack>
                    <HStack gap={1} vAlign="center"><Bullet /><Text type="body" maxLines={1}>Next run tomorrow</Text></HStack>
                  </HStack>
                </VStack>
              </StackItem>
              {!isNarrow && <HStack gap={2}>{actions}</HStack>}
            </HStack>
            {isNarrow && <HStack gap={2} wrap="wrap">{actions}</HStack>}
            <HStack vAlign="center">
              <StackItem size="fill"><TabList value={tab} onChange={(v) => setTab(v as At)} size="lg" isFullBleed><Tab value="found" label="Found" /><Tab value="does" label="What it does" /><Tab value="runs" label="Runs" /></TabList></StackItem>
              {!isNarrow && <Button label={showPanel ? "Hide panel" : "Show panel"} variant="ghost" icon={<Icon icon={ViewColumnsIcon} size="sm" />} isIconOnly onClick={() => setShowPanel((p) => !p)} />}
            </HStack>
          </VStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent role="main">
          <VStack gap={4}>
            {tab === "found" ? <Found /> : tab === "does" ? <Does /> : <Runs />}
            {isNarrow && <VStack gap={4}><Heading level={2}>About this trigger</Heading><PanelContent sectionLevel={3} /></VStack>}
          </VStack>
        </LayoutContent>
      }
      end={!isNarrow && showPanel ? <LayoutPanel width={320} padding={4} role="complementary"><PanelContent /></LayoutPanel> : undefined}
    />
  );
}

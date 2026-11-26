import { useState, type CSSProperties } from "react";
import { Button } from "@astryxdesign/core/Button";
import { CodeBlock } from "@astryxdesign/core/CodeBlock";
import { Divider } from "@astryxdesign/core/Divider";
import { Icon } from "@astryxdesign/core/Icon";
import { IconButton } from "@astryxdesign/core/IconButton";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Layout";
import { List, ListItem } from "@astryxdesign/core/List";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { Section } from "@astryxdesign/core/Section";
import { Table, pixel, proportional, type TableColumn } from "@astryxdesign/core/Table";
import { Heading, Text } from "@astryxdesign/core/Text";
import { useToast } from "@astryxdesign/core/Toast";
import { ToggleButton, ToggleButtonGroup } from "@astryxdesign/core/ToggleButton";
import { Token } from "@astryxdesign/core/Token";
import { Toolbar } from "@astryxdesign/core/Toolbar";
import { DocumentTextIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { go } from "../../shell";
import { FILE, NEW, PLAN, WOULD, type Because, type Would } from "./data";

const scroll: CSSProperties = { flex: 1, minHeight: 0, overflowY: "auto" };
export type Page = "plan" | "file" | "rehearsal" | "made";

const ABOUT: Readonly<Record<Because, "green" | "blue" | "gray">> = { "You said": "green", "Looked up": "blue", "Proposed": "gray" };
const small = (t: string) => <Text type="supporting" color="secondary">{t}</Text>;

/** The plan, one primitive after the other. Each line says why it is there. Once it is made, each part opens its screen. */
function Plan({ isMade }: { isMade: boolean }) {
  return (
    <VStack gap={5}>
      <VStack gap={1}>
        <Heading level={2}>More good calls</Heading>
        {small(isMade ? "Version 1, made 5 October. Open a part to see or change it." : `${NEW} things to make, 2 that are there. Nothing is made until you say so.`)}
      </VStack>
      {PLAN.map((b) => (
        <VStack key={b.primitive} gap={1}>
          <HStack gap={2} vAlign="center">
            <StackItem size="fill"><HStack gap={2} vAlign="center"><Heading level={3}>{b.primitive}</Heading>{small(b.is)}</HStack></StackItem>
            {isMade && <Button label="Open" size="sm" variant="ghost" aria-label={`Open ${b.screen}`} onClick={() => go(b.go)} />}
          </HStack>
          <List density="compact" hasDividers>
            {b.lines.map((l) => <ListItem key={l.text} label={l.text} {...(l.why ? { description: l.why } : {})} endContent={l.has ? <Token size="sm" color="gray" label="There" /> : <Token size="sm" color={ABOUT[l.because]} label={l.because} />} />)}
          </List>
        </VStack>
      ))}
    </VStack>
  );
}

function File() {
  return (
    <VStack gap={3}>
      <VStack gap={1}><Heading level={2}>The plan as a file</Heading>{small("The same plan. It can hold these seven things and nothing else, and is checked before it is made. Parts of it are left out here.")}</VStack>
      <CodeBlock code={FILE} language="yaml" width="100%" size="sm" isWrapped hasCopyButton />
    </VStack>
  );
}

interface Row extends Record<string, unknown> { id: string; w: Would }
function Rehearsal() {
  const showToast = useToast();
  const [said, setSaid] = useState<Readonly<Record<string, string>>>({ w3: "wrong" });
  const columns: TableColumn<Row>[] = [
    { key: "what", header: "What came", width: proportional(3, { minWidth: 140 }), renderCell: (r) => <VStack gap={0}><Text>{r.w.what}</Text><Text type="supporting" color="secondary">{r.w.real}</Text></VStack> },
    { key: "did", header: "It would", width: proportional(2, { minWidth: 100 }), renderCell: (r) => <Text color="secondary">{r.w.did}</Text> },
    { key: "say", header: "Was it right?", width: pixel(184), renderCell: (r) => (
      <ToggleButtonGroup label={`Was it right: ${r.w.what}`} value={said[r.id] ?? null} size="sm"
        onChange={(v) => { const s = typeof v === "string" ? v : ""; setSaid((x) => ({ ...x, [r.id]: s })); if (s === "wrong") showToast({ body: "Kept as an example of what it is not.", uniqueID: r.id }); }}>
        <ToggleButton value="right" label="Right" /><ToggleButton value="wrong" label="Wrong" />
      </ToggleButtonGroup>
    ) },
  ];
  return (
    <VStack gap={5}>
      <VStack gap={1}>
        <Heading level={2}>5 Sep to 4 Oct, without sending</Heading>
        <Text type="body">148 came in. It would have taken on 61, asked Bo 22 times, watched 18 and left 47 alone. $94. Bo spent about 6 hours on this in those days; it would have asked for about 40 minutes.</Text>
      </VStack>
      <Table<Row> data={WOULD.map((w) => ({ id: w.id, w }))} columns={columns} idKey="id" density="compact" dividers="rows" />
      <List density="compact">
        <ListItem label="7 that could teach it most" description="The rest are alike. Say nothing and they stay as they are." />
        <ListItem label="1 marked wrong: raising money is not a sign" description="I added that to the kind, and ran it again: 22 became 19." />
      </List>
    </VStack>
  );
}

const TITLE: Readonly<Record<Page, string>> = { plan: "Plan", file: "File", rehearsal: "Rehearsal", made: "Plan" };
export function Panel({ page, isMade, onMake, onPage, onClose }: { page: Page; isMade: boolean; onMake: () => void; onPage: (p: Page) => void; onClose: () => void }) {
  const tab = page === "made" ? "plan" : page;
  return (
    <>
      <Toolbar label="Plan" dividers={["bottom"]}
        startContent={<HStack gap={3} vAlign="center"><Icon icon={DocumentTextIcon} size="sm" color="secondary" /><VStack gap={0}><Text type="label" weight="semibold">{TITLE[page]}</Text><Text type="supporting" color="secondary">{isMade ? "Made, version 1" : "Not made"}</Text></VStack></HStack>}
        endContent={<><SegmentedControl label="Show" value={tab} onChange={(v) => onPage(v as Page)} size="sm"><SegmentedControlItem value="plan" label="Plan" /><SegmentedControlItem value="rehearsal" label="Rehearsal" /><SegmentedControlItem value="file" label="File" /></SegmentedControl><IconButton label="Close" variant="ghost" size="sm" icon={<Icon icon={XMarkIcon} size="sm" />} onClick={onClose} /></>} />
      <VStack style={scroll}><Section padding={4}>{tab === "plan" ? <Plan isMade={isMade} /> : tab === "file" ? <File /> : <Rehearsal />}</Section></VStack>
      <Divider />
      <HStack gap={2} padding={3} vAlign="center" wrap="wrap">
        <StackItem size="fill">{small(isMade ? "Juno looks again with you on 19 October." : "What it finds starts as Watch or Ask. What people ask for starts as Do.")}</StackItem>
        {isMade ? <Button label="Open Sales" variant="primary" onClick={() => go("m-sales-overview")} /> : <Button label="Make it" variant="primary" onClick={onMake} />}
      </HStack>
    </>
  );
}

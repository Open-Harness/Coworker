import { useState } from "react";
import { Divider } from "@astryxdesign/core/Divider";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import { Button } from "@astryxdesign/core/Button";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { FormLayout } from "@astryxdesign/core/FormLayout";
import { Icon } from "@astryxdesign/core/Icon";
import { IconButton } from "@astryxdesign/core/IconButton";
import { HStack, Layout, LayoutContent, LayoutFooter, VStack } from "@astryxdesign/core/Layout";
import { NumberInput } from "@astryxdesign/core/NumberInput";
import { Table, pixel, proportional, type TableColumn } from "@astryxdesign/core/Table";
import { Text } from "@astryxdesign/core/Text";
import { TextArea } from "@astryxdesign/core/TextArea";
import { Token } from "@astryxdesign/core/Token";
import { PencilIcon } from "@heroicons/react/24/outline";
import { Part } from "../../part";
import { Asking } from "./asking";
import { REACH } from "./data";
import { Note, useNotes } from "./notes";

type Line = readonly [string, string, string, string];
interface Row extends Record<string, unknown> { id: string; r: Line }
function Edit({ r, onClose, onKeep }: { r: Line; onClose: () => void; onKeep: (r: Line) => void }) {
  const [alone, setAlone] = useState(r[1]); const [asks, setAsks] = useState(r[2]);
  return (
    <Dialog isOpen onOpenChange={(o) => { if (!o) onClose(); }} purpose="form" width={520} padding={0}>
      <Layout header={<DialogHeader title={r[0]} onOpenChange={onClose} />}
        content={<LayoutContent><FormLayout>
          <TextArea label="By itself" rows={2} value={alone} onChange={(v: string) => setAlone(v)} />
          <TextArea label="Asks first" rows={2} value={asks} onChange={(v: string) => setAsks(v)} description="Say it in words. Juno shows you the exact actions before it counts" />
        </FormLayout></LayoutContent>}
        footer={<LayoutFooter hasDivider><HStack gap={2} hAlign="end"><Button label="Cancel" variant="ghost" onClick={onClose} /><Button label="Keep" variant="primary" onClick={() => onKeep([r[0], alone, asks, r[3]])} /></HStack></LayoutFooter>} />
    </Dialog>
  );
}

/** What it is allowed, within which limits, and who may ask. Saying yes to the draft, or to a version, is what allows it. */
export function Reach() {
  const { change, isDraft } = useNotes();
  const isNarrow = useMediaQuery("(max-width: 900px)");
  const [list, setList] = useState<readonly Line[]>(isDraft ? REACH : REACH.map(([a, b, c, d]) => [a, b, c, d === "There for everyone" ? d : "Connected"] as const));
  const [open_, setOpenLine] = useState<string | null>(null);
  const [day, setDay] = useState(20); const [open, setOpen] = useState(25); const [never, setNever] = useState("Give a price that is not on the site.\nSay a customer’s name to another customer.\nWrite to someone who said stop." + (isDraft ? "" : "\nWrite to a private address it found by itself."));
  const cols: TableColumn<Row>[] = [
    { key: "name", header: "Connector", width: pixel(isNarrow ? 108 : 100), renderCell: ({ r }) => <Text type="label">{r[0]}</Text> },
    { key: "alone", header: "By itself", width: proportional(2, { minWidth: 130 }), renderCell: ({ r }) => <VStack gap={0}><Text>{r[1]}</Text>{isNarrow && <><Text type="supporting" color="secondary">Asks: {r[2]}</Text><Text type="supporting" color="secondary">{r[3]}</Text></>}</VStack> },
    ...(isNarrow ? [] : [
      { key: "asks", header: "Asks first", width: proportional(2), renderCell: ({ r }: Row) => <Text>{r[2]}</Text> },
      { key: "state", header: "Now", width: pixel(196), renderCell: ({ r }: Row) => <Token size="sm" color={r[3].startsWith("Waits") ? "yellow" : "gray"} label={r[3]} /> },
    ]),
    { key: "do", header: "", width: pixel(isNarrow ? 60 : 92), renderCell: ({ r }) => <HStack gap={1} hAlign="end" {...(isNarrow ? { wrap: "wrap" as const } : {})}><Note at={r[0]} /><IconButton label={`Edit ${r[0]}`} size="sm" variant="ghost" icon={<Icon icon={PencilIcon} size="sm" />} onClick={() => setOpenLine(r[0])} /></HStack> },
  ];
  const line = list.find((r) => r[0] === open_);
  return (
    <VStack gap={5}>
      <Text type="supporting" color="secondary">Skills say what they would need. This says what is allowed, and it is part of what Juno may do, never more.</Text>
      <Table<Row> data={list.map((r) => ({ id: r[0], r }))} columns={cols} idKey="id" dividers="rows" verticalAlign="top" />
      {line && <Edit key={line[0]} r={line} onClose={() => setOpenLine(null)} onKeep={(r) => { setList(list.map((x) => (x[0] === r[0] ? r : x))); setOpenLine(null); change(); }} />}
      <Divider />
      <Part title="Limits" about="When one is reached it takes on nothing new, says so once, and finishes what is open.">
        <NumberInput label="Most it may spend in a day, in dollars" value={day} onChange={(n: number) => { setDay(n); change(); }} min={0} isIntegerOnly />
        <NumberInput label="Most pieces of work open at once" value={open} onChange={(n: number) => { setOpen(n); change(); }} min={1} isIntegerOnly />
      </Part>
      <Divider />
      <Part title="Never" about="Whoever asks, and whatever a skill says."><TextArea label="Never" isLabelHidden rows={4} value={never} onChange={(v: string) => { setNever(v); change(); }} /></Part>
      <Asking />
    </VStack>
  );
}

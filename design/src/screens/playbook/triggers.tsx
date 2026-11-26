import { useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Code } from "@astryxdesign/core/Code";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { FormLayout } from "@astryxdesign/core/FormLayout";
import { Icon } from "@astryxdesign/core/Icon";
import { IconButton } from "@astryxdesign/core/IconButton";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import { HStack, Layout, LayoutContent, LayoutFooter, StackItem, VStack } from "@astryxdesign/core/Layout";
import { Switch } from "@astryxdesign/core/Switch";
import { Table, pixel, proportional, type TableColumn } from "@astryxdesign/core/Table";
import { Text } from "@astryxdesign/core/Text";
import { TextArea } from "@astryxdesign/core/TextArea";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Token } from "@astryxdesign/core/Token";
import { PencilIcon } from "@heroicons/react/24/outline";
import { Link } from "@astryxdesign/core/Link";
import { feed } from "../../sales";
import { TRIGGERS, type Trigger } from "./data";
import { Note, useAccepted, useNotes } from "./notes";

interface Row extends Record<string, unknown> { id: string; t: Trigger }
function Edit({ t, onClose, onKeep }: { t: Trigger; onClose: () => void; onKeep: (t: Trigger) => void }) {
  const { isDraft } = useNotes();
  const [x, set] = useState(t);
  const up = (c: Partial<Trigger>) => set((v) => ({ ...v, ...c }));
  return (
    <Dialog isOpen onOpenChange={(o) => { if (!o) onClose(); }} purpose="form" width={520} padding={0}>
      <Layout header={<DialogHeader title={t.name} onOpenChange={onClose} />} content={
        <LayoutContent>
          <FormLayout>
            <TextInput label="When" value={x.when} onChange={(when: string) => up({ when })} description={x.by === "Cron" ? "In words. Juno turns it into a cron" : ""} />
            <TextArea label="What happens" rows={3} value={x.does} onChange={(does: string) => up({ does })} />
            <TextInput label="Only when" value={x.only} onChange={(only: string) => up({ only })} description="Checked first, in code. Costs nothing when it is not so" />
            <TextInput label="At most" value={x.most} onChange={(most: string) => up({ most })} />
            <Text type="supporting" color="secondary">{isDraft ? "On 5 Sep to 4 Oct" : "In 7 days"}: {t.found} came, {t.used} became work, {t.cost}.</Text>
          </FormLayout>
        </LayoutContent>
      } footer={<LayoutFooter hasDivider><HStack gap={2} hAlign="end"><Button label="Cancel" variant="ghost" onClick={onClose} /><Button label="Keep" variant="primary" onClick={() => onKeep(x)} /></HStack></LayoutFooter>} />
    </Dialog>
  );
}

/** What sets it off: by the clock, because something came, because something stayed as it was, because somebody asked. */
export function Triggers() {
  const { isDraft, change } = useNotes();
  const isNarrow = useMediaQuery("(max-width: 900px)");
  const isAccepted = useAccepted("c3");
  const isLater = isAccepted || !isDraft;
  const [list, setList] = useState(TRIGGERS);
  const [off, setOff] = useState<readonly string[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const shown = list.map((t) => (t.id === "signs" && isLater && t.when === "Weekdays, 07:00" ? { ...t, when: "Weekdays, 08:30", cron: "30 8 * * 1-5", next: "Tomorrow, 08:30" } : t)).map((t) => (isDraft ? t : { ...t, found: String(feed(t.feed).came), used: String(feed(t.feed).took), cost: `$${feed(t.feed).cost}` }));
  const sw = (t: Trigger) => <Switch label={t.name} isLabelHidden value={!off.includes(t.id)} onChange={(v: boolean) => { setOff((o) => (v ? o.filter((x) => x !== t.id) : [...o, t.id])); change(); }} />;
  const COLS: TableColumn<Row>[] = [
    { key: "name", header: "What", width: proportional(3, { minWidth: 180 }), renderCell: ({ t }) => <VStack gap={0}><HStack gap={2} vAlign="center" wrap="wrap">{!isDraft && t.id === "signs" ? <Link href="#m-sales-search" type="label">{t.name}</Link> : <Text type="label">{t.name}</Text>}{isDraft && <Token size="sm" color={t.because === "My idea" ? "blue" : "gray"} label={t.because} />}</HStack><Text type="supporting" color="secondary">{t.does}</Text>{isNarrow && <><Text type="supporting" color="secondary">{`${t.used} of ${t.found} became work, ${t.cost}`}</Text>{sw(t)}</>}</VStack> },
    { key: "when", header: "When", width: pixel(140), renderCell: ({ t }) => <VStack gap={0.5}><Text>{t.when}</Text>{!isDraft && t.next && <Text type="supporting" color="secondary">Next: {t.next}</Text>}{t.cron ? <HStack><Code>{t.cron}</Code></HStack> : <Text type="supporting" color="secondary">{t.by}</Text>}</VStack> },
    ...(isNarrow ? [] : [
      { key: "used", header: "Became work", width: pixel(116), align: "end" as const, renderCell: ({ t }: Row) => <VStack gap={0} hAlign="end"><Text hasTabularNumbers>{t.used === "0" ? `${t.found} watched` : `${t.used} of ${t.found}`}</Text><Text type="supporting" color="secondary">{t.cost}</Text></VStack> },
      { key: "on", header: "On", width: pixel(64), renderCell: ({ t }: Row) => sw(t) },
    ]),
    { key: "do", header: "", width: pixel(isNarrow ? 60 : 124), renderCell: ({ t }) => <HStack gap={1} hAlign="end" {...(isNarrow ? { wrap: "wrap" as const } : {})}><Note at={t.name} /><IconButton label={`Edit ${t.name}`} size="sm" variant="ghost" icon={<Icon icon={PencilIcon} size="sm" />} onClick={() => setOpen(t.id)} /></HStack> },
  ];
  const t = shown.find((x) => x.id === open);
  return (
    <VStack gap={4}>
      <HStack gap={2} vAlign="center" wrap="wrap"><StackItem size="fill"><Text type="supporting" color="secondary">What makes something come in. The numbers are from {isDraft ? "5 Sep to 4 Oct, tried without sending" : "the last 7 days"}.</Text></StackItem><Button label="Add one" size="sm" variant="secondary" onClick={() => setOpen("like")} /></HStack>
      <Table<Row> data={shown.map((x) => ({ id: x.id, t: x }))} columns={COLS} idKey="id" dividers="rows" verticalAlign="top" />
      {t && <Edit key={t.id} t={t} onClose={() => setOpen(null)} onKeep={(x) => { setList(shown.map((y) => (y.id === x.id ? x : y))); setOpen(null); change(); }} />}
    </VStack>
  );
}

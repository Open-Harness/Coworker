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
import { Asking } from "./asking.tsx";
import { Note, useNotes } from "./notes.tsx";
import { Part } from "./part.tsx";
import { accountName, grantWords } from "./words.ts";

interface Line {
  readonly name: string;
  readonly alone: string;
  readonly asks: string;
  readonly now: string;
  readonly waits: boolean;
}
interface Row extends Record<string, unknown> {
  id: string;
  r: Line;
}

function Edit({ r, onClose, onKeep }: { r: Line; onClose: () => void; onKeep: (r: Line) => void }) {
  const [alone, setAlone] = useState(r.alone);
  const [asks, setAsks] = useState(r.asks);
  return (
    <Dialog
      isOpen
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
      purpose="form"
      width={520}
      padding={0}
    >
      <Layout
        header={<DialogHeader title={r.name} onOpenChange={onClose} />}
        content={
          <LayoutContent>
            <FormLayout>
              <TextArea label="By itself" rows={2} value={alone} onChange={(v: string) => setAlone(v)} />
              <TextArea
                label="Asks first"
                rows={2}
                value={asks}
                onChange={(v: string) => setAsks(v)}
                description="Say it in words. Juno shows you the exact actions before it counts"
              />
            </FormLayout>
          </LayoutContent>
        }
        footer={
          <LayoutFooter hasDivider>
            <HStack gap={2} hAlign="end">
              <Button label="Cancel" variant="ghost" onClick={onClose} />
              <Button label="Keep" variant="primary" onClick={() => onKeep({ ...r, alone, asks })} />
            </HStack>
          </LayoutFooter>
        }
      />
    </Dialog>
  );
}

/** What it is allowed, within which limits, and who may ask. Saying yes to the draft, or to a version, is what allows it. */
export function Reach() {
  const { change, view, person } = useNotes();
  const isNarrow = useMediaQuery("(max-width: 900px)");
  const { reach } = view.playbook;
  const first = (id: string) => person(id).split(" ")[0] ?? id;
  const state = (account: string): Pick<Line, "now" | "waits"> => {
    const a = view.accounts.find((x) => x.account === account);
    if (a === undefined || a.state === "works") return { now: "Connected", waits: false };
    if (a.state === "read only") return { now: "To read, for now", waits: false };
    if (a.state === "built in") return { now: "There for everyone", waits: false };
    return { now: `Waits for ${a.person === null ? "a person" : first(a.person)}`, waits: true };
  };
  const [list, setList] = useState<readonly Line[]>(
    reach.grants.map((g) => ({ name: accountName(g.account), ...grantWords(g, first), ...state(g.account) })),
  );
  const [open_, setOpenLine] = useState<string | null>(null);
  const [day, setDay] = useState(reach.limits.perDay ?? 0);
  const [open, setOpen] = useState(reach.limits.atOnce ?? 0);
  const [never, setNever] = useState(reach.never.join("\n"));
  const cols: TableColumn<Row>[] = [
    { key: "name", header: "Connector", width: pixel(isNarrow ? 108 : 100), renderCell: ({ r }) => <Text type="label">{r.name}</Text> },
    {
      key: "alone",
      header: "By itself",
      width: proportional(2, { minWidth: 130 }),
      renderCell: ({ r }) => (
        <VStack gap={0}>
          <Text>{r.alone}</Text>
          {isNarrow && (
            <>
              <Text type="supporting" color="secondary">
                Asks: {r.asks}
              </Text>
              <Text type="supporting" color="secondary">
                {r.now}
              </Text>
            </>
          )}
        </VStack>
      ),
    },
    ...(isNarrow
      ? []
      : [
          { key: "asks", header: "Asks first", width: proportional(2), renderCell: ({ r }: Row) => <Text>{r.asks}</Text> },
          {
            key: "state",
            header: "Now",
            width: pixel(196),
            renderCell: ({ r }: Row) => <Token size="sm" color={r.waits ? "yellow" : "gray"} label={r.now} />,
          },
        ]),
    {
      key: "do",
      header: "",
      width: pixel(isNarrow ? 60 : 92),
      renderCell: ({ r }) => (
        <HStack gap={1} hAlign="end" {...(isNarrow ? { wrap: "wrap" as const } : {})}>
          <Note at={r.name} />
          <IconButton
            label={`Edit ${r.name}`}
            size="sm"
            variant="ghost"
            icon={<Icon icon={PencilIcon} size="sm" />}
            onClick={() => setOpenLine(r.name)}
          />
        </HStack>
      ),
    },
  ];
  const line = list.find((r) => r.name === open_);
  return (
    <VStack gap={5}>
      <Text type="supporting" color="secondary">
        Skills say what they would need. This says what is allowed, and it is part of what Juno may do, never more.
      </Text>
      <Table<Row> data={list.map((r) => ({ id: r.name, r }))} columns={cols} idKey="id" dividers="rows" verticalAlign="top" />
      {line && (
        <Edit
          key={line.name}
          r={line}
          onClose={() => setOpenLine(null)}
          onKeep={(r) => {
            setList(list.map((x) => (x.name === r.name ? r : x)));
            setOpenLine(null);
            change();
          }}
        />
      )}
      <Divider />
      <Part title="Limits" about="When one is reached it takes on nothing new, says so once, and finishes what is open.">
        <NumberInput
          label="Most it may spend in a day, in dollars"
          value={day}
          onChange={(n: number) => {
            setDay(n);
            change();
          }}
          min={0}
          isIntegerOnly
        />
        <NumberInput
          label="Most pieces of work open at once"
          value={open}
          onChange={(n: number) => {
            setOpen(n);
            change();
          }}
          min={1}
          isIntegerOnly
        />
      </Part>
      <Divider />
      <Part title="Never" about="Whoever asks, and whatever a skill says.">
        <TextArea
          label="Never"
          isLabelHidden
          rows={4}
          value={never}
          onChange={(v: string) => {
            setNever(v);
            change();
          }}
        />
      </Part>
      <Asking />
    </VStack>
  );
}

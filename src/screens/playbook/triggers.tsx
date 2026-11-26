import { useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Code } from "@astryxdesign/core/Code";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import { Icon } from "@astryxdesign/core/Icon";
import { IconButton } from "@astryxdesign/core/IconButton";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Layout";
import { Link } from "@astryxdesign/core/Link";
import { Switch } from "@astryxdesign/core/Switch";
import { Table, pixel, proportional, type TableColumn } from "@astryxdesign/core/Table";
import { Text } from "@astryxdesign/core/Text";
import { Token } from "@astryxdesign/core/Token";
import { PencilIcon } from "@heroicons/react/24/outline";
import { useClock, useHref } from "~/modules/page/service.ts";
import { useDay } from "./day.ts";
import { Edit, rowsOf, type Trigger } from "./trigger-edit.tsx";
import { Note, useNotes } from "./notes.tsx";
import { aheadWords, cronOf, upper } from "./words.ts";

interface Row extends Record<string, unknown> {
  id: string;
  t: Trigger;
}

/** What sets it off: by the clock, because something came, because something stayed as it was, because somebody asked. */
export function Triggers() {
  const { isDraft, change, view, comments, said } = useNotes();
  const isNarrow = useMediaQuery("(max-width: 900px)");
  const [clock, href, date] = [useClock(), useHref(), useDay()];
  const { zone } = date;
  const [list, setList] = useState<readonly Trigger[] | null>(null);
  const [off, setOff] = useState<readonly string[]>(view.triggers.filter((r) => !r.trigger.on).map((r) => r.trigger.id));
  const [open, setOpen] = useState<string | null>(null);
  const base = list ?? rowsOf(view, (at) => aheadWords(at, clock.now(), zone, clock.time(at)));
  const shown = base.map((t) => {
    const taken = comments.find((c) => said[c.id] === "accepted" && c.change !== null && c.change.was === t.when && c.part === "Triggers");
    return taken?.change == null ? t : { ...t, when: taken.change.now, cron: cronOf(taken.change.now) ?? t.cron };
  });
  const past =
    view.past === null
      ? "the past work, tried without sending"
      : `${date.day(view.past.from)} to ${date.day(view.past.to)}, tried without sending`;
  const manager = view.head?.id;
  const sw = (t: Trigger) => (
    <Switch
      label={t.name}
      isLabelHidden
      value={!off.includes(t.id)}
      onChange={(v: boolean) => {
        setOff((o) => (v ? o.filter((x) => x !== t.id) : [...o, t.id]));
        change();
      }}
    />
  );
  const COLS: TableColumn<Row>[] = [
    {
      key: "name",
      header: "What",
      width: proportional(3, { minWidth: 180 }),
      renderCell: ({ t }) => (
        <VStack gap={0}>
          <HStack gap={2} vAlign="center" wrap="wrap">
            {!isDraft && manager !== undefined ? (
              <Link href={href(`/m/${manager}/triggers/${t.id}`)} type="label">
                {t.name}
              </Link>
            ) : (
              <Text type="label">{t.name}</Text>
            )}
            {isDraft && t.because !== "" && <Token size="sm" color={t.because === "my idea" ? "blue" : "gray"} label={upper(t.because)} />}
          </HStack>
          <Text type="supporting" color="secondary">
            {t.does}
          </Text>
          {isNarrow && (
            <>
              <Text type="supporting" color="secondary">{`${t.used} of ${t.found} became work, ${t.cost}`}</Text>
              {sw(t)}
            </>
          )}
        </VStack>
      ),
    },
    {
      key: "when",
      header: "When",
      width: pixel(140),
      renderCell: ({ t }) => (
        <VStack gap={0.5}>
          <Text>{t.when}</Text>
          {!isDraft && t.next !== null && (
            <Text type="supporting" color="secondary">
              Next: {t.next}
            </Text>
          )}
          {t.cron !== "" ? (
            <HStack>
              <Code>{t.cron}</Code>
            </HStack>
          ) : (
            <Text type="supporting" color="secondary">
              {t.by}
            </Text>
          )}
        </VStack>
      ),
    },
    ...(isNarrow
      ? []
      : [
          {
            key: "used",
            header: "Became work",
            width: pixel(116),
            align: "end" as const,
            renderCell: ({ t }: Row) => (
              <VStack gap={0} hAlign="end">
                <Text hasTabularNumbers>{t.used === 0 ? `${t.found} watched` : `${t.used} of ${t.found}`}</Text>
                <Text type="supporting" color="secondary">
                  {t.cost}
                </Text>
              </VStack>
            ),
          },
          { key: "on", header: "On", width: pixel(64), renderCell: ({ t }: Row) => sw(t) },
        ]),
    {
      key: "do",
      header: "",
      width: pixel(isNarrow ? 60 : 124),
      renderCell: ({ t }) => (
        <HStack gap={1} hAlign="end" {...(isNarrow ? { wrap: "wrap" as const } : {})}>
          <Note at={t.name} />
          <IconButton
            label={`Edit ${t.name}`}
            size="sm"
            variant="ghost"
            icon={<Icon icon={PencilIcon} size="sm" />}
            onClick={() => setOpen(t.id)}
          />
        </HStack>
      ),
    },
  ];
  const t = shown.find((x) => x.id === open);
  return (
    <VStack gap={4}>
      <HStack gap={2} vAlign="center" wrap="wrap">
        <StackItem size="fill">
          <Text type="supporting" color="secondary">
            What makes something come in. The numbers are from {isDraft ? past : "the last 7 days"}.
          </Text>
        </StackItem>
        <Button label="Add one" size="sm" variant="secondary" onClick={() => setOpen(shown[0]?.id ?? null)} />
      </HStack>
      <Table<Row> data={shown.map((x) => ({ id: x.id, t: x }))} columns={COLS} idKey="id" dividers="rows" verticalAlign="top" />
      {t && (
        <Edit
          key={t.id}
          t={t}
          onClose={() => setOpen(null)}
          onKeep={(x) => {
            setList(shown.map((y) => (y.id === x.id ? x : y)));
            setOpen(null);
            change();
          }}
        />
      )}
    </VStack>
  );
}

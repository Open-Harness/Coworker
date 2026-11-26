import { useState } from "react";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import { HStack, VStack } from "@astryxdesign/core/Layout";
import { ProgressBar } from "@astryxdesign/core/ProgressBar";
import { pixel, proportional, Table, type TableColumn } from "@astryxdesign/core/Table";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { useGo } from "~/modules/page/service.ts";
import { useDoing } from "./act.ts";
import type { JunoPage } from "./types.ts";
import { useWords } from "./words.ts";

interface Row extends Record<string, unknown> {
  id: string;
  name: string;
  part: string;
  piece: string;
  used: number;
}
const num = (text: string): number => {
  const value = Number(text);
  return Number.isFinite(value) && value >= 0 ? value : 0;
};

/** Who sits under whom among the managers that have a part, said from the shell's tree: "A and B work under C, and D under E. " */
function underNote(managers: readonly string[], words: ReturnType<typeof useWords>): string {
  const byParent = new Map<string, string[]>();
  for (const id of managers) {
    const parent = words.above(id);
    if (parent !== null) byParent.set(parent, [...(byParent.get(parent) ?? []), words.manager(id)]);
  }
  const clauses = [...byParent].map(([parent, names], at) => {
    const who = names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}` : (names[0] ?? "");
    return `${who} ${at === 0 ? "work " : ""}under ${words.manager(parent)}`;
  });
  return clauses.length === 0 ? "" : `${clauses.join(", and ")}. `;
}

/** The whole limit is the one in Settings. Juno hands it out in parts, and the parts cannot come to more than the whole. */
export function Spending({ view, onDirty }: JunoPage) {
  const [go, act, words] = [useGo(), useDoing(), useWords()];
  const isNarrow = useMediaQuery("(max-width: 768px)");
  const whole = view.spending.whole;
  const [rows, setRows] = useState<Row[]>(() =>
    view.spending.parts.map((p) => ({
      id: p.manager,
      name: words.manager(p.manager),
      part: String(p.part),
      piece: p.perWork === null ? "" : String(p.perWork),
      used: p.used,
    })),
  );
  const under = underNote(
    view.spending.parts.map((p) => p.manager),
    words,
  );
  const handed = rows.reduce((sum, r) => sum + num(r.part), 0);
  const over = handed - whole;
  const edit = (id: string, key: "part" | "piece", text: string) => {
    const next = rows.map((r) => (r.id === id ? { ...r, [key]: text } : r));
    setRows(next);
    // It cannot be saved while the parts come to more than the whole.
    if (next.reduce((sum, r) => sum + num(r.part), 0) <= whole) {
      onDirty(() =>
        act("spending.save", {
          parts: JSON.stringify(next.map((r) => ({ manager: r.id, part: num(r.part), perWork: r.piece === "" ? null : num(r.piece) }))),
        }),
      );
    }
  };
  const cols: TableColumn<Row>[] = [
    {
      key: "name",
      header: "Manager",
      width: proportional(1, { minWidth: 110 }),
      renderCell: (r) => (
        <Text type="body" maxLines={1}>
          {r.name}
        </Text>
      ),
    },
    {
      key: "part",
      header: "A day",
      width: pixel(isNarrow ? 92 : 130),
      renderCell: (r) => (
        <TextInput label={`${r.name}, a day`} isLabelHidden value={r.part} onChange={(text: string) => edit(r.id, "part", text)} />
      ),
    },
    {
      key: "used",
      header: "Used a day",
      width: proportional(1, { minWidth: isNarrow ? 80 : 140 }),
      renderCell: (r) => (
        <VStack gap={1}>
          <Text type="body">{`$${r.used.toFixed(1)}`}</Text>
          <ProgressBar
            label={`${r.name} used`}
            isLabelHidden
            value={r.used}
            max={Math.max(num(r.part), 1)}
            variant={r.used > num(r.part) ? "error" : "neutral"}
          />
        </VStack>
      ),
    },
    {
      key: "piece",
      header: "Per piece of work",
      width: pixel(130),
      renderCell: (r) => (
        <TextInput
          label={`${r.name}, per piece of work`}
          isLabelHidden
          value={r.piece}
          onChange={(text: string) => edit(r.id, "piece", text)}
        />
      ),
    },
  ];
  const columns = isNarrow ? cols.filter((c) => c.key !== "piece") : cols;
  return (
    <VStack gap={4}>
      <VStack gap={1}>
        <Text type="body">{`$${handed} of the $${whole} a day is handed out.`}</Text>
        <Text type="supporting" color="secondary">
          All amounts are dollars. Used a day is the average of the last 7 days. A piece of work stops at its own limit and asks.
        </Text>
        <HStack>
          <Button label={`Change the $${whole} in Settings, General`} size="sm" variant="ghost" onClick={() => go("/settings/general")} />
        </HStack>
      </VStack>
      {over > 0 && (
        <Banner
          status="error"
          title={`That is $${over} too much`}
          description={`The parts come to $${handed}, and the whole is $${whole}. Take $${over} from one of them. It cannot be saved like this.`}
        />
      )}
      <Table<Row> data={rows} columns={columns} idKey="id" density="balanced" dividers="rows" />
      <Text type="supporting" color="secondary">
        {`${under}Each has a part of its own, and a manager above cannot spend a part below it.`}
      </Text>
    </VStack>
  );
}

// astryx-template: form-wizard-vertical
import { useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Layout";
import { List, ListItem } from "@astryxdesign/core/List";
import { ProgressBar } from "@astryxdesign/core/ProgressBar";
import { Table, pixel, proportional, type TableColumn } from "@astryxdesign/core/Table";
import { Heading, Text } from "@astryxdesign/core/Text";
import { TextArea } from "@astryxdesign/core/TextArea";
import { useToast } from "@astryxdesign/core/Toast";
import { Token } from "@astryxdesign/core/Token";
import type { Figure, SetUpView } from "~/modules/views-manager/types.ts";
import type { Wants } from "~/modules/walkthrough/types.ts";

type State = "has" | "no" | "on" | "asked" | "skipped";
const LABEL: Readonly<Record<State, string>> = { has: "Connected", on: "To read only", asked: "Asked", skipped: "Skipped", no: "" };

const stateOf = (want: Wants, look: SetUpView["looks"][number] | undefined): State =>
  want.state === "connected" ? (look?.had ? "has" : "on") : want.state === "asked" ? "asked" : want.state === "skipped" ? "skipped" : "no";

/** What the co-worker would like to read before it drafts. Each says what it reads, what it tells, and what is missing without it. */
export function Connect({
  wants,
  looks,
  onPress,
}: {
  wants: readonly Wants[];
  looks: SetUpView["looks"];
  onPress: (connector: string, is: "connected" | "skipped") => void;
}) {
  const showToast = useToast();
  return (
    <List density="balanced" hasDividers>
      {wants.map((w, i) => {
        const look = looks[i];
        const name = look?.name ?? w.connector;
        const s = stateOf(w, look);
        const press = (is: "connected" | "skipped") => {
          onPress(w.connector, is);
          if (is === "connected")
            showToast({
              body: look?.signs
                ? `${look.signs} is asked to sign in to ${name.replace(`${look.signs}’s `, "the ")}`
                : `${name}: to read only, until the draft is made or thrown away`,
              uniqueID: w.connector,
            });
        };
        const ask = look?.signs ? `Ask ${look.signs}` : "Connect";
        return (
          <ListItem
            key={w.connector}
            label={
              <HStack gap={2} vAlign="center" wrap="wrap">
                <Text type="label">{name}</Text>
                {s !== "no" && (
                  <Token
                    size="sm"
                    color={s === "asked" ? "yellow" : "gray"}
                    label={s === "asked" && look?.signs ? `Asked ${look.signs}` : LABEL[s]}
                  />
                )}
              </HStack>
            }
            description={
              <VStack gap={0}>
                <Text type="supporting" color="secondary">
                  Reads: {w.reads}
                </Text>
                <Text type="supporting" color="secondary">
                  Tells me: {w.tells}
                </Text>
                {w.without && (
                  <Text type="supporting" color="secondary">
                    Without it: {w.without}
                  </Text>
                )}
              </VStack>
            }
            endContent={
              s === "has" ? undefined : s === "no" || s === "skipped" ? (
                <HStack gap={1}>
                  <Button label={ask} aria-label={`Connect ${name}`} size="sm" variant="secondary" onClick={() => press("connected")} />
                  {s === "no" && (
                    <Button label="Skip" aria-label={`Skip ${name}`} size="sm" variant="ghost" onClick={() => press("skipped")} />
                  )}
                </HStack>
              ) : (
                <Button label="Undo" aria-label={`Undo ${name}`} size="sm" variant="ghost" onClick={() => press("skipped")} />
              )
            }
          />
        );
      })}
    </List>
  );
}

/** A finding, where it was read, and room to say that it is wrong. */
function Finding({
  title,
  from,
  onWrong,
  children,
}: {
  title: string;
  from: string;
  onWrong: (says: string) => void;
  children: React.ReactNode;
}) {
  const showToast = useToast();
  const [isWrong, setWrong] = useState(false);
  const [text, setText] = useState("");
  return (
    <VStack gap={3}>
      <HStack gap={2} vAlign="start">
        <StackItem size="fill">
          <VStack gap={0}>
            <Heading level={3}>{title}</Heading>
            <Text type="supporting" color="secondary">
              {from}
            </Text>
          </VStack>
        </StackItem>
        {!isWrong && (
          <Button
            label="Not right"
            style={{ flexShrink: 0 }}
            aria-label={`Not right: ${title}`}
            size="sm"
            variant="ghost"
            onClick={() => setWrong(true)}
          />
        )}
      </HStack>
      {children}
      {isWrong && (
        <VStack gap={2}>
          <TextArea label="What is wrong?" rows={2} value={text} onChange={(v: string) => setText(v)} />
          <HStack gap={2}>
            <Button
              label="Tell the co-worker"
              size="sm"
              variant="secondary"
              onClick={() => {
                setWrong(false);
                onWrong(text);
                showToast({ body: "It looks again, and changes the draft.", uniqueID: title });
              }}
            />
            <Button label="Cancel" size="sm" variant="ghost" onClick={() => setWrong(false)} />
          </HStack>
        </VStack>
      )}
    </VStack>
  );
}

type Tries = Extract<Figure, { _tag: "Tries" }>["rows"][number];
interface Cad extends Record<string, unknown> {
  id: string;
  row: Tries;
}
const COLS: TableColumn<Cad>[] = [
  {
    key: "a",
    header: "Look",
    width: proportional(2, { minWidth: 130 }),
    renderCell: (r) => (
      <HStack gap={2} vAlign="center">
        <Text>{r.row.look}</Text>
        {r.row.picked && <Token size="sm" color="gray" label="Juno’s pick" />}
      </HStack>
    ),
  },
  { key: "b", header: "Finds", width: pixel(72), align: "end", renderCell: (r) => <Text hasTabularNumbers>{String(r.row.finds)}</Text> },
  {
    key: "d",
    header: "When",
    width: pixel(112),
    renderCell: (r) => <Text color="secondary">{r.row.late === 0 ? "Same day" : `${r.row.late} days late`}</Text>,
  },
  { key: "e", header: "Cost", width: pixel(72), align: "end", renderCell: (r) => <Text hasTabularNumbers>{`$${r.row.cost}`}</Text> },
];

function Drawn({ figure }: { figure: Figure }) {
  if (figure._tag === "Said") return <Text type="body">{figure.text}</Text>;
  if (figure._tag === "Tries")
    return (
      <Table<Cad> data={figure.rows.map((row) => ({ id: row.look, row }))} columns={COLS} idKey="id" density="compact" dividers="rows" />
    );
  // Rows that add up to the whole are shares of it; any other are steps, each counted on its own.
  const isSplit = figure.rows.reduce((sum, r) => sum + r.n, 0) === figure.of;
  return (
    <VStack gap={3}>
      {figure.rows.map((r) => (
        <VStack key={r.label} gap={0.5}>
          <ProgressBar
            label={r.label}
            value={r.n}
            max={figure.of}
            hasValueLabel
            formatValueLabel={(v) => (isSplit ? `${v} of ${figure.of}` : String(v))}
          />
          {r.note !== null && (
            <Text type="supporting" color="secondary">
              {r.note}
            </Text>
          )}
        </VStack>
      ))}
    </VStack>
  );
}

/** What it found, each with where it was read. */
export function Found({
  walk,
  figures,
  onWrong,
}: {
  walk: SetUpView["walk"];
  figures: SetUpView["figures"];
  onWrong: (finding: string, says: string) => void;
}) {
  return (
    <VStack gap={8}>
      {walk.findings.map((f) => {
        const figure = figures[f.id];
        return (
          <Finding key={f.id} title={f.says} from={f.from} onWrong={(says) => onWrong(f.id, says)}>
            {figure === undefined ? null : <Drawn figure={figure} />}
          </Finding>
        );
      })}
    </VStack>
  );
}

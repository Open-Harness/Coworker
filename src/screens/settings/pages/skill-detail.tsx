// astryx-template: table
import { useState } from "react";
import { Divider } from "@astryxdesign/core/Divider";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Layout";
import { Markdown } from "@astryxdesign/core/Markdown";
import { MetadataList, MetadataListItem } from "@astryxdesign/core/MetadataList";
import { Table, proportional, type TableColumn } from "@astryxdesign/core/Table";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Token } from "@astryxdesign/core/Token";
import { TreeList, type TreeListItemData } from "@astryxdesign/core/TreeList";
import type { SharedView } from "~/modules/views-workspace/types.ts";
import { capital, day } from "../format.ts";

export type Skill = SharedView["skills"][number];
type Run = Skill["cases"][number] & Record<string, unknown>;

/** A share, or a count out of how many there were. */
const shareSaid = (n: number, of: number | null): string => (of === null ? `${Math.round(n * 100)}%` : `${n} of ${of}`);
export const liftSaid = (s: Skill): string =>
  s.comparison === null ? "" : `${shareSaid(s.comparison.without, s.comparison.of)}, ${shareSaid(s.comparison.with, s.comparison.of)}`;

const FROM = { library: "Library", connector: "With the connector", harness: "Co-worker" } as const;
export function fromSaid(s: Skill): string {
  if (s.from !== "here") return FROM[s.from];
  const others = [...new Set(s.usedBy.map((u) => u.manager))].filter((m) => m !== s.madeFor);
  if (s.madeFor !== null) return others.length > 0 ? `Yours, ${others.join(", ")} uses it` : `Made for ${s.madeFor}`;
  return "Yours";
}

export function Detail({ s, zone }: { readonly s: Skill; readonly zone: string }) {
  const isNarrow = useMediaQuery("(max-width: 1250px)");
  const [file, setFile] = useState(s.files[0]?.name ?? "SKILL.md");
  const items: TreeListItemData[] = s.files.map((f) => ({
    id: f.name,
    label: f.name,
    isSelected: f.name === file,
    onClick: () => setFile(f.name),
  }));
  const when = (n: Skill["versions"][number]): string => (n.at === null ? "Library" : day(n.at, zone));
  const runs: TableColumn<Run>[] = [
    { key: "what", header: "Case", width: proportional(2, { minWidth: 120 }), renderCell: (c) => <Text maxLines={2}>{c.what}</Text> },
    {
      key: "without",
      header: "Without it",
      width: proportional(1, { minWidth: 100 }),
      renderCell: (c) => (
        <Text color="secondary" maxLines={2}>
          {c.without}
        </Text>
      ),
    },
    {
      key: "with",
      header: "With it",
      width: proportional(1, { minWidth: 100 }),
      renderCell: (c) => (
        <Text maxLines={2} weight={c.with !== c.without ? "semibold" : "normal"}>
          {c.with}
        </Text>
      ),
    },
  ];
  const first = s.versions[0];
  const users = s.usedBy;
  return (
    <VStack gap={4}>
      <VStack gap={0.5}>
        <HStack gap={2} vAlign="center">
          <Heading level={3} accessibilityLevel={3}>
            {s.name}
          </Heading>
          <Token size="sm" label={capital(s.layer)} />
        </HStack>
        <Text type="supporting" color="secondary">
          {s.says}
        </Text>
      </VStack>
      <MetadataList columns={isNarrow ? 1 : 2}>
        <MetadataListItem label="From">{fromSaid(s)}</MetadataListItem>
        <MetadataListItem label="Version">{first ? `${first.n}, ${when(first)}` : String(s.version)}</MetadataListItem>
        {s.comparison !== null ? (
          <MetadataListItem label="Without it, with it">
            {liftSaid(s)}
            {s.cut ? ". Left out: it changed nothing" : ""}
          </MetadataListItem>
        ) : null}
      </MetadataList>
      <Divider />
      <VStack gap={2}>
        <Text type="label">Files</Text>
        <HStack gap={4} vAlign="start" wrap={isNarrow ? "wrap" : "nowrap"}>
          <VStack width={isNarrow ? "100%" : 170}>
            <TreeList items={items} density="compact" />
          </VStack>
          <StackItem size="fill">
            <Markdown headingLevelStart={4}>{s.files.find((f) => f.name === file)?.text ?? ""}</Markdown>
          </StackItem>
        </HStack>
      </VStack>
      <Divider />
      <VStack gap={2}>
        <Text type="label">Versions</Text>
        {s.versions.map((ver) => (
          <HStack key={ver.n} gap={3} vAlign="start">
            <Text hasTabularNumbers weight="semibold">
              {ver.n}
            </Text>
            <StackItem size="fill">
              <VStack gap={0}>
                <Text>{ver.says}</Text>
                <Text type="supporting" color="secondary">
                  {ver.by}, {when(ver)}
                </Text>
              </VStack>
            </StackItem>
          </HStack>
        ))}
      </VStack>
      {s.layer === "craft" ? (
        <>
          <Divider />
          <VStack gap={2}>
            <VStack gap={0.5}>
              <Text type="label">The same cases, with it and without it</Text>
              <Text type="supporting" color="secondary">
                It stays only if more come out right with it than without.
              </Text>
            </VStack>
            <Table<Run>
              data={s.cases.map((c) => ({ ...c }))}
              columns={runs}
              idKey="what"
              density="compact"
              dividers="rows"
              verticalAlign="top"
            />
          </VStack>
        </>
      ) : null}
      <Divider />
      <VStack gap={1}>
        <Text type="label">Who uses it</Text>
        {users.length === 0 ? (
          <Text color="secondary">Nobody.</Text>
        ) : (
          <HStack gap={1} wrap="wrap">
            {users.map((u) => (
              <Token key={u.manager + u.agent} size="sm" label={`${u.manager}: ${u.agent}`} />
            ))}
          </HStack>
        )}
      </VStack>
    </VStack>
  );
}

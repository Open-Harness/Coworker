// astryx-template: ide
import { useState } from "react";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Layout";
import { Markdown } from "@astryxdesign/core/Markdown";
import { MetadataList, MetadataListItem } from "@astryxdesign/core/MetadataList";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { Heading, Text } from "@astryxdesign/core/Text";
import { TextArea } from "@astryxdesign/core/TextArea";
import { TreeList, type TreeListItemData } from "@astryxdesign/core/TreeList";
import { useChanged } from "./page.tsx";
import { Note, useNotes } from "./notes.tsx";
import { fromWords, liftWords } from "./skills.tsx";

/** One skill: its files, its words, what it is worth. The harness and the connectors can be read, and noted on, not changed. */
export function SkillPage({ id, onBack }: { id: string; onBack: () => void }) {
  const { change, view } = useNotes();
  const isNarrow = useMediaQuery("(max-width: 900px)");
  const s = view.skills.find((x) => x.id === id) ?? view.skills[0];
  const [file, setFile] = useState("SKILL.md");
  const [mode, setMode] = useState("read");
  const [own, setOwn] = useState<Readonly<Record<string, string>>>({});
  const prefix = `skills/${id}/`;
  const made = Object.entries(view.playbook.skillFiles).filter(([path]) => path.startsWith(prefix));
  const owned: Readonly<Record<string, string>> = Object.fromEntries(made.map(([path, text]) => [path.slice(prefix.length), text]));
  const main = useChanged(
    "Skills",
    owned["SKILL.md"] ?? (s?.layer === "playbook" ? view.playbook.page : `# ${s?.name ?? id}\n\n${s?.says ?? ""}.`),
    `skills/${id}`,
  );
  if (s === undefined) return null;
  const files: Readonly<Record<string, string>> = { ...owned, "SKILL.md": main };
  const isOurs = s.layer === "harness" || s.layer === "connector";
  const text = own[file] ?? files[file] ?? "";
  const items: TreeListItemData[] = Object.keys(files).map((f) => ({ id: f, label: f, isSelected: f === file, onClick: () => setFile(f) }));
  const stood = view.evals.find((e) => e.eval.of === `skills/${id}`);
  const unchanged = stood?.eval.good.includes("unchanged") === true;
  const lift =
    s.without === null || s.with === null
      ? null
      : unchanged
        ? `${s.without}% unchanged without it, ${s.with}% with it`
        : `${liftWords(s).split(", ")[0]} without it, ${liftWords(s).split(", ")[1]} with it`;
  return (
    <VStack gap={4}>
      <HStack gap={2} vAlign="center" wrap="wrap">
        <Button label="All skills" size="sm" variant="ghost" onClick={onBack} />
        <StackItem size="fill">
          <Heading level={3} accessibilityLevel={2}>
            {s.name}
          </Heading>
        </StackItem>
        <Note at={s.name} />
        {!isOurs && (
          <SegmentedControl label="Show" value={mode} onChange={setMode} size="sm">
            <SegmentedControlItem value="read" label="Read" />
            <SegmentedControlItem value="edit" label="Edit" />
          </SegmentedControl>
        )}
      </HStack>
      {s.left !== null && <Banner status="info" title="Juno left this one out" description={`${s.left} Use it anyway if you know why.`} />}
      {isOurs && (
        <Banner
          status="info"
          title={s.layer === "harness" ? "The same for everyone" : "Comes with the connector"}
          description={s.layer === "harness" ? "You can read it. Co-worker keeps it." : "You can add notes of your own, which go on top."}
        />
      )}
      <MetadataList columns={isNarrow ? "single" : "multi"}>
        <MetadataListItem label="From">{fromWords(s, view.playbook.name)}</MetadataListItem>
        <MetadataListItem label="Used by">{s.left !== null ? "Nobody" : s.by.join(", ")}</MetadataListItem>
        {lift !== null && <MetadataListItem label={`On ${stood?.eval.cases.length ?? 0} past cases`}>{lift}</MetadataListItem>}
        {stood !== undefined && typeof stood.eval.judge === "object" && "model" in stood.eval.judge && (
          <MetadataListItem label="Judged by">{stood.how}</MetadataListItem>
        )}
      </MetadataList>
      <HStack gap={5} vAlign="start" wrap={isNarrow ? "wrap" : "nowrap"}>
        <VStack width={isNarrow ? "100%" : 180}>
          <TreeList items={items} density="compact" />
        </VStack>
        <StackItem size="fill">
          {mode === "edit" && !isOurs ? (
            <TextArea
              label={file}
              rows={20}
              value={text}
              onChange={(v: string) => {
                setOwn((o) => ({ ...o, [file]: v }));
                change();
              }}
            />
          ) : (
            <Markdown headingLevelStart={3}>{text}</Markdown>
          )}
          {mode === "edit" && (
            <Text type="supporting" color="secondary">
              Tried on the past cases again when you keep it.
            </Text>
          )}
        </StackItem>
      </HStack>
    </VStack>
  );
}

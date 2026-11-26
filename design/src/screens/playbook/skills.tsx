import { Button } from "@astryxdesign/core/Button";
import { Icon } from "@astryxdesign/core/Icon";
import { IconButton } from "@astryxdesign/core/IconButton";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Layout";
import { Table, pixel, proportional, type TableColumn } from "@astryxdesign/core/Table";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Token } from "@astryxdesign/core/Token";
import { ChevronRightIcon } from "@heroicons/react/24/outline";
import { LAYERS, SKILLS, type Skill } from "./data";
import { Note, useNotes } from "./notes";

interface Row extends Record<string, unknown> { id: string; s: Skill }
/** Its skills, layer by layer. A craft skill is there only if the same cases come out better with it than without. */
export function Skills() {
  const { openSkill, isDraft } = useNotes();
  const isNarrow = useMediaQuery("(max-width: 900px)");
  const cols = (isCraft: boolean): TableColumn<Row>[] => [
    { key: "name", header: "Skill", width: proportional(3, { minWidth: 170 }), renderCell: ({ s }) => <VStack gap={0}><HStack gap={2} vAlign="center" wrap="wrap"><Text type="label">{s.name}</Text>{isDraft && s.isNew && <Token size="sm" color="blue" label="New" />}{s.cut && <Token size="sm" color="gray" label="Left out" />}</HStack><Text type="supporting" color="secondary">{s.cut ? "It changed nothing, so nobody has to read it" : s.says}</Text></VStack> },
    ...(isNarrow ? [] : [
      { key: "by", header: "Used by", width: pixel(150), renderCell: ({ s }: Row) => <VStack gap={0}><Text>{s.cut ? "Nobody" : s.by}</Text><Text type="supporting" color="secondary">{s.from}</Text></VStack> },
    ]),
    ...(isCraft ? [{ key: "lift", header: "Without, with", width: pixel(128), align: "end" as const, renderCell: ({ s }: Row) => <Text hasTabularNumbers>{s.without}, {s.with}</Text> }] : []),
    { key: "do", header: "", width: pixel(isNarrow ? 60 : 124), renderCell: ({ s }) => <HStack gap={1} hAlign="end" {...(isNarrow ? { wrap: "wrap" as const } : {})}><Note at={s.name} /><IconButton label={`Open ${s.name}`} size="sm" variant="ghost" icon={<Icon icon={ChevronRightIcon} size="sm" />} onClick={() => openSkill(s.id)} /></HStack> },
  ];
  return (
    <VStack gap={6}>
      <HStack gap={2} vAlign="center" wrap="wrap"><StackItem size="fill"><Text type="supporting" color="secondary">An agent has the harness, the connectors it may use, its crafts, and its page of the playbook. A skill never allows anything: that is Reach.</Text></StackItem><Button label="Add a skill" size="sm" variant="secondary" onClick={() => openSkill("objections")} /></HStack>
      {LAYERS.map(([name, about]) => (
        <VStack key={name} gap={2}>
          <VStack gap={0}><Heading level={4} accessibilityLevel={2}>{name}</Heading><Text type="supporting" color="secondary">{about}</Text></VStack>
          <Table<Row> data={SKILLS.filter((s) => s.layer === name).map((s) => ({ id: s.id, s }))} columns={cols(name === "Craft")} idKey="id" dividers="rows" density="compact" verticalAlign="top" />
        </VStack>
      ))}
    </VStack>
  );
}

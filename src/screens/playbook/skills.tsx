import { Button } from "@astryxdesign/core/Button";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import { Icon } from "@astryxdesign/core/Icon";
import { IconButton } from "@astryxdesign/core/IconButton";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Layout";
import { Table, pixel, proportional, type TableColumn } from "@astryxdesign/core/Table";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Token } from "@astryxdesign/core/Token";
import { ChevronRightIcon } from "@heroicons/react/24/outline";
import type { PlaybookView } from "~/modules/views-manager/types.ts";
import { Note, useNotes } from "./notes.tsx";

type Skill = PlaybookView["skills"][number];
interface Row extends Record<string, unknown> {
  id: string;
  s: Skill;
}

const LAYERS = [
  ["playbook", "Playbook", "What this manager is. One, and it is this"],
  ["craft", "Craft", "One thing done well. Agents name the ones they use"],
  ["connector", "Connector", "Comes with what is connected. Your notes go on top"],
  ["harness", "Harness", "How working here works. Ours, the same for everyone"],
] as const;

/** Where a skill comes from, in a few words. */
export function fromWords(s: Skill, manager: string): string {
  if (s.layer === "playbook") return "Written with you";
  if (s.from === "here") return `Made for ${manager}`;
  if (s.also.length > 0) return `Yours, ${s.also.join(", ")} uses it`;
  return s.from === "library" ? "Library" : s.from === "connector" ? "With the connector" : "Co-worker";
}
/** What the same cases came to without the skill and with it. */
export const liftWords = (s: Skill): string =>
  s.without === null || s.with === null
    ? ""
    : s.of === null
      ? `${s.without}%, ${s.with}%`
      : `${s.without} of ${s.of}, ${s.with} of ${s.of}`;

/** Its skills, layer by layer. A craft skill is there only if the same cases come out better with it than without. */
export function Skills() {
  const { openSkill, isDraft, view, about } = useNotes();
  const isNarrow = useMediaQuery("(max-width: 900px)");
  const manager = view.playbook.name;
  const cols = (isCraft: boolean): TableColumn<Row>[] => [
    {
      key: "name",
      header: "Skill",
      width: proportional(3, { minWidth: 170 }),
      renderCell: ({ s }) => (
        <VStack gap={0}>
          <HStack gap={2} vAlign="center" wrap="wrap">
            <Text type="label">{s.name}</Text>
            {isDraft && s.from === "here" && <Token size="sm" color="blue" label="New" />}
            {s.left !== null && <Token size="sm" color="gray" label="Left out" />}
          </HStack>
          <Text type="supporting" color="secondary">
            {s.left !== null ? "It changed nothing, so nobody has to read it" : s.says}
          </Text>
        </VStack>
      ),
    },
    ...(isNarrow
      ? []
      : [
          {
            key: "by",
            header: "Used by",
            width: pixel(150),
            renderCell: ({ s }: Row) => (
              <VStack gap={0}>
                <Text>{s.left !== null ? "Nobody" : s.by.join(", ")}</Text>
                <Text type="supporting" color="secondary">
                  {fromWords(s, manager)}
                </Text>
              </VStack>
            ),
          },
        ]),
    ...(isCraft
      ? [
          {
            key: "lift",
            header: "Without, with",
            width: pixel(128),
            align: "end" as const,
            renderCell: ({ s }: Row) => <Text hasTabularNumbers>{liftWords(s)}</Text>,
          },
        ]
      : []),
    {
      key: "do",
      header: "",
      width: pixel(isNarrow ? 60 : 124),
      renderCell: ({ s }) => (
        <HStack gap={1} hAlign="end" {...(isNarrow ? { wrap: "wrap" as const } : {})}>
          <Note at={s.name} />
          <IconButton
            label={`Open ${s.name}`}
            size="sm"
            variant="ghost"
            icon={<Icon icon={ChevronRightIcon} size="sm" />}
            onClick={() => openSkill(s.id)}
          />
        </HStack>
      ),
    },
  ];
  return (
    <VStack gap={6}>
      <HStack gap={2} vAlign="center" wrap="wrap">
        <StackItem size="fill">
          <Text type="supporting" color="secondary">
            An agent has the harness, the connectors it may use, its crafts, and its page of the playbook. A skill never allows anything:
            that is Reach.
          </Text>
        </StackItem>
        <Button label="Add a skill" size="sm" variant="secondary" onClick={() => about("")} />
      </HStack>
      {LAYERS.map(([layer, name, about]) => (
        <VStack key={name} gap={2}>
          <VStack gap={0}>
            <Heading level={4} accessibilityLevel={2}>
              {name}
            </Heading>
            <Text type="supporting" color="secondary">
              {about}
            </Text>
          </VStack>
          <Table<Row>
            data={view.skills.filter((s) => s.layer === layer).map((s) => ({ id: s.id, s }))}
            columns={cols(layer === "craft")}
            idKey="id"
            dividers="rows"
            density="compact"
            verticalAlign="top"
          />
        </VStack>
      ))}
    </VStack>
  );
}

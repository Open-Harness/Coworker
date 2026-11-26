// astryx-template: table
import { useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import { HStack, VStack } from "@astryxdesign/core/Layout";
import { Table, pixel, proportional, type TableColumn } from "@astryxdesign/core/Table";
import { Heading, Text } from "@astryxdesign/core/Text";
import { useToast } from "@astryxdesign/core/Toast";
import { Reading, useRead } from "~/modules/page/service.ts";
import type { SharedView } from "~/modules/views-workspace/types.ts";
import { useOpenRow } from "../rows.ts";
import { Split } from "../split.tsx";
import { Detail, liftSaid, type Skill } from "./skill-detail.tsx";

interface Row extends Record<string, unknown> {
  readonly id: string;
  readonly s: Skill;
}
/** The four layers, and what each is: a skill never allows anything, that is Reach. */
const LAYERS = [
  ["playbook", "Playbook", "What this manager is. One, and it is this"],
  ["craft", "Craft", "One thing done well. Agents name the ones they use"],
  ["connector", "Connector", "Comes with what is connected. Your notes go on top"],
  ["harness", "Harness", "How working here works. Ours, the same for everyone"],
] as const;

const usersOf = (s: Skill): string => (s.cut ? "Left out" : [...new Set(s.usedBy.map((u) => u.manager))].join(", ") || "Nobody");

function Skills({ view, zone }: { readonly view: SharedView; readonly zone: string }) {
  const toast = useToast();
  const [open, setOpen] = useState<string | null>(
    useMediaQuery("(max-width: 1100px)") ? null : (view.skills.find((k) => k.layer === "craft")?.id ?? view.skills[0]?.id ?? null),
  );
  const row = useOpenRow<Row>(open, (r) => setOpen(r.id));
  const s = view.skills.find((x) => x.id === open);
  const cols: TableColumn<Row>[] = [
    {
      key: "name",
      header: "Skill",
      width: proportional(2, { minWidth: 150 }),
      renderCell: ({ s: k }) => (
        <VStack gap={0}>
          <Text type="label" maxLines={1}>
            {k.name}
          </Text>
          <Text type="supporting" color="secondary" maxLines={1}>
            {usersOf(k)}
          </Text>
        </VStack>
      ),
    },
    {
      key: "lift",
      header: "Without, with",
      width: pixel(116),
      align: "end",
      renderCell: ({ s: k }) => (
        <Text hasTabularNumbers color="secondary" maxLines={2}>
          {liftSaid(k)}
        </Text>
      ),
    },
  ];
  const list = (
    <VStack gap={4}>
      <VStack gap={0.5}>
        <Heading level={3} accessibilityLevel={2}>
          Skills
        </Heading>
        <Text type="supporting" color="secondary">
          How things are done well, in four layers. Every manager takes from here, and keeps its own on top.
        </Text>
      </VStack>
      <HStack>
        <Button
          label="Add a skill"
          variant="secondary"
          onClick={() => toast({ body: "Ask Juno to write one from what you have: it makes a draft, and tries it", uniqueID: "add-skill" })}
        />
      </HStack>
      {LAYERS.map(([id, name, about]) => (
        <VStack key={id} gap={1}>
          <VStack gap={0}>
            <Text type="label">{name}</Text>
            <Text type="supporting" color="secondary">
              {about}
            </Text>
          </VStack>
          <Table<Row>
            data={view.skills.filter((k) => k.layer === id).map((k) => ({ id: k.id, s: k }))}
            columns={cols}
            idKey="id"
            density="compact"
            dividers="rows"
            verticalAlign="top"
            plugins={{ row }}
          />
        </VStack>
      ))}
    </VStack>
  );
  return (
    <Split
      list={list}
      width={360}
      back={{ label: "All skills", onBack: () => setOpen(null) }}
      detail={s ? <Detail key={s.id} s={s} zone={zone} /> : null}
    />
  );
}

/** The library, in four layers. A skill never allows anything: that is Reach. */
export default function SkillsPage() {
  const shell = useRead("/shell");
  const zone = shell._tag === "Ok" ? shell.value.workspace.zone : "UTC";
  return <Reading from="/settings/shared">{(view) => <Skills view={view} zone={zone} />}</Reading>;
}

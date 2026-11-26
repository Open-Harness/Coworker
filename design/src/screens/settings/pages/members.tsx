// astryx-template: table
import { useState } from "react";
import { Avatar } from "@astryxdesign/core/Avatar";
import { Button } from "@astryxdesign/core/Button";
import { DropdownMenu } from "@astryxdesign/core/DropdownMenu";
import { Icon } from "@astryxdesign/core/Icon";
import { Badge } from "@astryxdesign/core/Badge";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import { HStack, Layout, LayoutContent, LayoutHeader, StackItem, VStack } from "@astryxdesign/core/Layout";
import { Selector } from "@astryxdesign/core/Selector";
import { pixel, proportional, Table, type TableColumn } from "@astryxdesign/core/Table";
import { Text } from "@astryxdesign/core/Text";
import { Token } from "@astryxdesign/core/Token";
import { useToast } from "@astryxdesign/core/Toast";
import { VisuallyHidden } from "@astryxdesign/core/VisuallyHidden";
import { EllipsisHorizontalIcon } from "@heroicons/react/24/outline";
import { ASKED, MEMBERS, ROLES, type Member, type Role } from "../facts/people";

export const meta = { fills: true };
type Row = Member & Record<string, unknown>;

/** People in the workspace, what each may do, and where else they are known. Juno uses the last to tell who is asking. */
export default function Members({ onDirty }: { onDirty: () => void }) {
  void onDirty;
  const showToast = useToast();
  const isNarrow = useMediaQuery("(max-width: 768px)");
  const [rows, setRows] = useState<Row[]>(() => MEMBERS.map((m) => ({ ...m })));
  const [asked, setAsked] = useState<readonly (typeof ASKED)[number][]>(ASKED);
  const say = (body: string) => showToast({ body, uniqueID: body });
  const person = (r: Row) => (
    <HStack gap={2} vAlign="center">
      <Avatar name={r.name} size={28} tooltip={false} />
      <VStack gap={0}><Text type="body" maxLines={1}>{r.name}</Text><Text type="supporting" color="secondary" maxLines={1}>{r.mail}</Text></VStack>
    </HStack>
  );
  const all: TableColumn<Row>[] = [
    { key: "name", header: "Person", width: proportional(1.3, { minWidth: 190 }), renderCell: person },
    { key: "role", header: "May", width: pixel(140), renderCell: (r) => r.role === "Owner" && rows.filter((x) => x.role === "Owner").length === 1
      ? <Text type="body">Owner</Text>
      : <Selector label={`Role of ${r.name}`} isLabelHidden size="sm" value={r.role} options={ROLES.map((x) => ({ value: x, label: x }))}
          onChange={(v) => { if (v) { setRows((x) => x.map((y) => (y.id === r.id ? { ...y, role: v as Role } : y))); say(`${r.name} is now a ${v}`); } }} /> },
    { key: "known", header: "Known on", width: proportional(1.4, { minWidth: 200 }), renderCell: (r) => r.known.length === 0
      ? <Text type="supporting" color="secondary">Nowhere yet</Text>
      : <HStack gap={1} wrap="wrap">{r.known.map((k) => <Token key={k} label={k} size="sm" />)}</HStack> },
    { key: "seen", header: "Last seen", width: pixel(130), renderCell: (r) => <VStack gap={0}><Text type="body" maxLines={1}>{r.seen}</Text>{r.invited && <Text type="supporting" color="secondary">{r.invited}</Text>}</VStack> },
    { key: "more", header: <VisuallyHidden>Actions</VisuallyHidden>, width: pixel(56), renderCell: (r) => (
      <DropdownMenu hasChevron={false} alignment="end" button={{ label: `Actions for ${r.name}`, variant: "ghost", size: "sm", icon: <Icon icon={EllipsisHorizontalIcon} size="sm" />, isIconOnly: true }}
        items={r.invited
          ? [{ label: "Send the invite again", onClick: () => say(`Sent again to ${r.mail}`) }, { label: "Take the invite back", onClick: () => { setRows((x) => x.filter((y) => y.id !== r.id)); say("Invite taken back"); } }]
          : r.role === "Owner" ? [{ label: "Link another account", onClick: () => say("Ask Juno on that connector: it asks them to say who they are") }]
          : [{ label: "Link another account", onClick: () => say("Ask Juno on that connector: it asks them to say who they are") }, { label: "Remove from the workspace", onClick: () => { setRows((x) => x.filter((y) => y.id !== r.id)); say(`${r.name} was removed`); } }]} />
    ) },
  ];
  const columns = isNarrow ? all.filter((c) => ["name", "role", "more"].includes(c.key as string)) : all;
  return (
    <Layout height="fill"
      header={
        <LayoutHeader hasDivider={false} padding={4}>
          <VStack gap={4}>
            <HStack gap={2} vAlign="center" wrap="wrap">
              <StackItem size="fill"><Text type="supporting" color="secondary">{`${rows.length} people. An Owner does everything. A Builder changes managers. A Member asks and answers.`}</Text></StackItem>
              <Button label="Invite" size="sm" variant="secondary" onClick={() => say("Type a mail address, and they get a link")} />
            </HStack>
            {asked.map((a) => (
              <HStack key={a.id} gap={3} vAlign="center" wrap="wrap">
                <Badge label="Asked to join" variant="warning" />
                <StackItem size="fill"><Text type="body">{a.name}, {a.mail}, {a.when}</Text></StackItem>
                <HStack gap={2}>
                  <Button label="Let in as Member" size="sm" variant="primary" onClick={() => { setAsked([]); say(`${a.name} is in`); }} />
                  <Button label="Say no" size="sm" variant="secondary" onClick={() => { setAsked([]); say("They are told no"); }} />
                </HStack>
              </HStack>
            ))}
          </VStack>
        </LayoutHeader>
      }
      content={<LayoutContent role="main" padding={0}><Table<Row> data={rows} columns={columns} idKey="id" density="balanced" dividers="rows" textOverflow="truncate" hasHover /></LayoutContent>}
    />
  );
}

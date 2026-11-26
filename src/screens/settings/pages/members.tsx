// astryx-template: table
import { useState } from "react";
import { Avatar } from "@astryxdesign/core/Avatar";
import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { DropdownMenu } from "@astryxdesign/core/DropdownMenu";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import { Icon } from "@astryxdesign/core/Icon";
import { HStack, Layout, LayoutContent, LayoutHeader, StackItem, VStack } from "@astryxdesign/core/Layout";
import { Selector } from "@astryxdesign/core/Selector";
import { pixel, proportional, Table, type TableColumn } from "@astryxdesign/core/Table";
import { Text } from "@astryxdesign/core/Text";
import { Token } from "@astryxdesign/core/Token";
import { useToast } from "@astryxdesign/core/Toast";
import { VisuallyHidden } from "@astryxdesign/core/VisuallyHidden";
import { EllipsisHorizontalIcon } from "@heroicons/react/24/outline";
import { Reading, useClock, useRead } from "~/modules/page/service.ts";
import type { Clock } from "~/modules/page/types.ts";
import type { MembersView } from "~/modules/views-workspace/types.ts";
import type { Role } from "~/modules/doings/types.ts";
import { useDoing } from "../doing.ts";
import { connectorName, day, lastSeen, when } from "../format.ts";

const ROLES: readonly Role[] = ["Owner", "Builder", "Member"];
interface Row extends Record<string, unknown> {
  readonly id: string;
  readonly name: string;
  readonly mail: string;
  readonly role: Role;
  readonly known: readonly string[];
  readonly seen: string;
  readonly invited?: string;
}

const rowsOf = (view: MembersView, zone: string, clock: Clock): Row[] => [
  ...view.people.map((one) => ({
    id: one.id,
    name: one.name,
    mail: one.mails[0] ?? "",
    role: one.role === "Outside" ? ("Member" as const) : one.role,
    known: one.known.map((k) => (k.as === "" ? connectorName(k.connector) : `${connectorName(k.connector)}: ${k.as}`)),
    seen: lastSeen(one.lastSeen, zone, clock),
  })),
  ...view.invited.map((one) => ({
    id: one.id,
    name: one.name ?? one.mail,
    mail: one.mail,
    role: one.role,
    known: [],
    seen: "Not yet",
    invited: `Invited ${day(one.at, zone)}`,
  })),
];

function Members({ view, zone }: { readonly view: MembersView; readonly zone: string }) {
  const [showToast, isNarrow, clock, doing] = [useToast(), useMediaQuery("(max-width: 768px)"), useClock(), useDoing()];
  const [rows, setRows] = useState<Row[]>(() => rowsOf(view, zone, clock));
  const [asked, setAsked] = useState(view.wantIn);
  const say = (body: string) => showToast({ body, uniqueID: body });
  const person = (r: Row) => (
    <HStack gap={2} vAlign="center">
      <Avatar name={r.name} size={32} tooltip={false} />
      <VStack gap={0}>
        <Text type="body" maxLines={1}>
          {r.name}
        </Text>
        <Text type="supporting" color="secondary" maxLines={1}>
          {r.mail}
        </Text>
      </VStack>
    </HStack>
  );
  const link = { label: "Link another account", onClick: () => say("Ask Juno on that connector: it asks them to say who they are") };
  const all: TableColumn<Row>[] = [
    { key: "name", header: "Person", width: proportional(1.3, { minWidth: 190 }), renderCell: person },
    {
      key: "role",
      header: "May",
      width: pixel(140),
      renderCell: (r) =>
        r.role === "Owner" && rows.filter((x) => x.role === "Owner").length === 1 ? (
          <Text type="body">Owner</Text>
        ) : (
          <Selector
            label={`Role of ${r.name}`}
            isLabelHidden
            size="sm"
            value={r.role}
            options={ROLES.map((x) => ({ value: x, label: x }))}
            onChange={(v) => {
              if (!v) return;
              setRows((x) => x.map((y) => (y.id === r.id ? { ...y, role: v as Role } : y)));
              void doing("person.role", { person: r.id, role: v }, ["/settings/members"]);
            }}
          />
        ),
    },
    {
      key: "known",
      header: "Known on",
      width: proportional(1.4, { minWidth: 200 }),
      renderCell: (r) =>
        r.known.length === 0 ? (
          <Text type="supporting" color="secondary">
            Nowhere yet
          </Text>
        ) : (
          <HStack gap={1} wrap="wrap">
            {r.known.map((k) => (
              <Token key={k} label={k} size="sm" />
            ))}
          </HStack>
        ),
    },
    {
      key: "seen",
      header: "Last seen",
      width: pixel(130),
      renderCell: (r) => (
        <VStack gap={0}>
          <Text type="body" maxLines={1}>
            {r.seen}
          </Text>
          {r.invited && (
            <Text type="supporting" color="secondary">
              {r.invited}
            </Text>
          )}
        </VStack>
      ),
    },
    {
      key: "more",
      header: <VisuallyHidden>Actions</VisuallyHidden>,
      width: pixel(56),
      renderCell: (r) => (
        <DropdownMenu
          hasChevron={false}
          alignment="end"
          button={{
            label: `Actions for ${r.name}`,
            variant: "ghost",
            size: "sm",
            icon: <Icon icon={EllipsisHorizontalIcon} size="sm" />,
            isIconOnly: true,
          }}
          items={
            r.invited
              ? [
                  { label: "Send the invite again", onClick: () => say(`Sent again to ${r.mail}`) },
                  {
                    label: "Take the invite back",
                    onClick: () => {
                      setRows((x) => x.filter((y) => y.id !== r.id));
                      void doing("person.remove", { person: r.id }, ["/settings/members"]);
                    },
                  },
                ]
              : r.role === "Owner"
                ? [link]
                : [
                    link,
                    {
                      label: "Remove from the workspace",
                      onClick: () => {
                        setRows((x) => x.filter((y) => y.id !== r.id));
                        void doing("person.remove", { person: r.id }, ["/settings/members"]);
                      },
                    },
                  ]
          }
        />
      ),
    },
  ];
  const columns = isNarrow ? all.filter((c) => ["name", "role", "more"].includes(c.key as string)) : all;
  return (
    <Layout
      height="fill"
      header={
        <LayoutHeader hasDivider={false} padding={4}>
          <VStack gap={4}>
            <HStack gap={2} vAlign="center" wrap="wrap">
              <StackItem size="fill">
                <Text
                  type="supporting"
                  color="secondary"
                >{`${rows.length} people. An Owner does everything. A Builder changes managers. A Member asks and answers.`}</Text>
              </StackItem>
              <Button label="Invite" size="sm" variant="secondary" onClick={() => say("Type a mail address, and they get a link")} />
            </HStack>
            {asked.map((a) => (
              <HStack key={a.id} gap={3} vAlign="center" wrap="wrap">
                <Badge label="Asked to join" variant="warning" />
                <StackItem size="fill">
                  <Text type="body">
                    {a.name}, {a.mail}, {when(a.at, zone, clock)}
                  </Text>
                </StackItem>
                <HStack gap={2}>
                  <Button
                    label="Let in as Member"
                    size="sm"
                    variant="primary"
                    onClick={() => {
                      setAsked((x) => x.filter((y) => y.id !== a.id));
                      void doing("person.let_in", { request: a.id }, ["/settings/members"]);
                    }}
                  />
                  <Button
                    label="Say no"
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setAsked((x) => x.filter((y) => y.id !== a.id));
                      void doing("person.say_no", { request: a.id }, ["/settings/members"]);
                    }}
                  />
                </HStack>
              </HStack>
            ))}
          </VStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent role="main" padding={0}>
          <Table<Row> data={rows} columns={columns} idKey="id" density="balanced" dividers="rows" textOverflow="truncate" hasHover />
        </LayoutContent>
      }
    />
  );
}

/** People in the workspace, what each may do, and where else they are known. Juno uses the last to tell who is asking. */
export default function MembersPage() {
  const shell = useRead("/shell");
  const zone = shell._tag === "Ok" ? shell.value.workspace.zone : "UTC";
  return <Reading from="/settings/members">{(view) => <Members view={view} zone={zone} />}</Reading>;
}

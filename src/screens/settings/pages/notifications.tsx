// astryx-template: settings
import { useState } from "react";
import { CheckboxInput } from "@astryxdesign/core/CheckboxInput";
import { Divider } from "@astryxdesign/core/Divider";
import { VStack } from "@astryxdesign/core/Layout";
import { pixel, proportional, Table, type TableColumn } from "@astryxdesign/core/Table";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { useToast } from "@astryxdesign/core/Toast";
import { Reading } from "~/modules/page/service.ts";
import type { MeView } from "~/modules/views-workspace/types.ts";
import { place } from "../format.ts";
import { Part } from "../part.tsx";
import type { Dirty } from "../types.ts";

type Where = "inbox" | "mail" | "slack";
interface Kind extends Record<string, unknown> {
  readonly id: string;
  readonly name: string;
  readonly about: string;
  readonly inbox: boolean;
  readonly mail: boolean;
  readonly slack: boolean;
  readonly locked: boolean;
}
const DAYS = ["Sundays", "Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays"] as const;
/** What can reach you, and what each is: the console tells where each goes. */
const KINDS: readonly (readonly [string, string, string])[] = [
  ["waits", "Something waits for you", "A question, an approval, a review"],
  ["wrong", "Something went wrong", "A manager is stuck, a number is offline, a limit is near"],
  ["done", "Work you asked for is done", "The result, once"],
  ["propose", "Juno proposes a change", "Before it tries one, and what it found"],
  ["week", "The week, in a page", ""],
];

function Notifications({ view, onDirty }: { readonly view: MeView; readonly onDirty: Dirty }) {
  const showToast = useToast();
  const [rows, setRows] = useState<Kind[]>(() =>
    KINDS.map(([id, name, about]) => {
      const to = view.tell[id] ?? [];
      return {
        id,
        name,
        about: id === "week" ? `${DAYS[view.weekAt.day % 7]}, ${view.weekAt.at}` : about,
        inbox: to.includes("inbox"),
        mail: to.includes("mail"),
        slack: to.includes("slack"),
        locked: id === "waits",
      };
    }),
  );
  const [from, setFrom] = useState(view.quiet?.from ?? "");
  const [to, setTo] = useState(view.quiet?.to ?? "");
  const [night, setNight] = useState(view.quiet !== null);
  const [wrongToo, setWrongToo] = useState(view.quiet?.unlessWrong ?? false);
  const kept = () => onDirty(() => showToast({ body: "Saved", uniqueID: "save" }));
  const set = (id: string, w: Where, v: boolean) => {
    setRows((x) => x.map((r) => (r.id === id ? { ...r, [w]: v } : r)));
    kept();
  };
  const box = (w: Where, label: string): TableColumn<Kind> => ({
    key: w,
    header: label,
    width: pixel(76),
    renderCell: (r) => (
      <CheckboxInput
        label={`${r.name}, ${label}`}
        isLabelHidden
        value={r[w] as boolean}
        isDisabled={r.locked && w === "inbox"}
        onChange={(v: boolean) => set(r.id, w, v)}
      />
    ),
  });
  const cols: TableColumn<Kind>[] = [
    {
      key: "name",
      header: "Tell me when",
      width: proportional(1, { minWidth: 180 }),
      renderCell: (r) => (
        <VStack gap={0}>
          <Text type="body">{r.name}</Text>
          <Text type="supporting" color="secondary">
            {r.about}
          </Text>
        </VStack>
      ),
    },
    box("inbox", "Inbox"),
    box("mail", "Mail"),
    box("slack", "Slack"),
  ];
  return (
    <>
      <Part
        title="What reaches you"
        about={`Your inbox always has it. Mail goes to ${view.mails[0]?.mail ?? "your mail"}. Slack is a message from Juno to you.`}
      >
        <Table<Kind> data={rows} columns={cols} idKey="id" density="balanced" dividers="rows" />
      </Part>
      <Divider />
      <Part title="When not" about="Mail and Slack wait until the morning. Your inbox still fills.">
        <CheckboxInput
          label="Keep mail and Slack quiet at night"
          description={`Your time zone: ${place(view.zone)}.`}
          value={night}
          onChange={(v: boolean) => {
            setNight(v);
            kept();
          }}
        />
        <TextInput
          label="From"
          value={from}
          isDisabled={!night}
          onChange={(v: string) => {
            setFrom(v);
            kept();
          }}
        />
        <TextInput
          label="Until"
          value={to}
          isDisabled={!night}
          onChange={(v: string) => {
            setTo(v);
            kept();
          }}
        />
        <CheckboxInput
          label="Still tell me at night when something went wrong"
          value={wrongToo}
          isDisabled={!night}
          onChange={(v: boolean) => {
            setWrongToo(v);
            kept();
          }}
        />
      </Part>
    </>
  );
}

export default function NotificationsPage({ onDirty }: { readonly onDirty: Dirty }) {
  return <Reading from="/settings/me">{(view) => <Notifications view={view} onDirty={onDirty} />}</Reading>;
}

// astryx-template: work-item-detail
import { useState } from "react";
import { Divider } from "@astryxdesign/core/Divider";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import { Layout, LayoutContent, LayoutPanel, VStack } from "@astryxdesign/core/Layout";
import { Heading } from "@astryxdesign/core/Text";
import { useToast } from "@astryxdesign/core/Toast";
import { Reading, useApi, useBrowser, useClock, useRead, useRefresh } from "~/modules/page/service.ts";
import type { PageProps } from "~/modules/page/types.ts";
import type { WorkView } from "~/modules/views-manager/types.ts";
import { dayMonth, useZone } from "../manager-frame/words.ts";
import { AboutSection } from "./about.tsx";
import { ActivitySection, type ActivityEntry } from "./activity.tsx";
import { Gone } from "./gone.tsx";
import { DetailsPanel } from "./details.tsx";
import { DoneWhenSection, type DoneItem } from "./done-when.tsx";
import { PageHeader, type Fields } from "./header.tsx";
import { EvidenceSection, ThreadsSection } from "./lists.tsx";

/** One piece of work: what it is, when it is done, what shows so, who worked on it, and what was said. */
function Task({ view, name }: { readonly view: WorkView; readonly name: string }) {
  const showToast = useToast();
  const [api, refresh, { newId }, clock, zone, shell] = [useApi(), useRefresh(), useBrowser(), useClock(), useZone(), useRead("/shell")];
  const manager = view.head.id;
  const me = shell._tag === "Ok" ? shell.value.me : undefined;
  const [fields, setFields] = useState<Fields>({
    step: view.work.step,
    kind: view.work.kind,
    answers: view.answers.id,
    labels: view.labels.map((one) => ({ id: one.toLowerCase(), label: one, color: "gray" as const })),
  });
  const checks = view.work.doneWhen ?? [];
  const [ticked, setTicked] = useState<Readonly<Record<string, boolean>>>({});
  const [added, setAdded] = useState<readonly DoneItem[]>([]);
  const [said, setSaid] = useState<readonly ActivityEntry[]>([]);
  const [comment, setComment] = useState("");
  const [isTold, setTold] = useState(me !== undefined && view.told.some((one) => one.id === me.id));
  const isNarrow = useMediaQuery("(max-width: 1024px)", true);
  const [isDetailsOpen, setDetailsOpen] = useState(true);

  const done: DoneItem[] = [
    ...checks.map((check) => {
      const shown = view.work.evidence.find((one) => one.check === check.id);
      const isDone = ticked[check.id] ?? shown?.met ?? false;
      return {
        id: check.id,
        text: check.says,
        done: isDone,
        by: ticked[check.id] === undefined ? (shown?.says ?? "Not shown yet") : isDone ? `Ticked by ${me?.name ?? "you"}` : "Not shown yet",
      };
    }),
    ...added,
  ];
  const activity: ActivityEntry[] = [
    ...said,
    ...view.activity.map((one, i) => ({
      id: `a${i}`,
      kind: "event" as const,
      who: one.who,
      when: `${dayMonth(one.at, zone)}, ${clock.time(one.at)}`,
      text: one.text,
    })),
  ];
  const log = (text: string, kind: ActivityEntry["kind"] = "event") =>
    setSaid((was) => [
      { id: `n${was.length}`, kind, who: me?.name ?? "You", when: `${dayMonth(clock.now(), zone)}, ${clock.time(clock.now())}`, text },
      ...was,
    ]);
  const tell = (what: string) => showToast({ body: `${name} is told: ${what}.`, uniqueID: "told" });
  const soon = (what: string) => showToast({ body: `${what} is not in this first set.`, uniqueID: what });

  /** A change goes through its doing; the page keeps what was chosen until the answer says otherwise. */
  const change = async (patch: Partial<Fields>, what: string) => {
    const before = fields;
    setFields((was) => ({ ...was, ...patch }));
    const did =
      patch.step !== undefined
        ? await api.write("/do", { doing: "work.move", values: { manager, work: view.work.id, step: patch.step }, key: newId() })
        : patch.answers !== undefined
          ? await api.write("/do", { doing: "work.answers", values: { manager, work: view.work.id, person: patch.answers }, key: newId() })
          : undefined;
    if (did === undefined) return soon("Changing that");
    if (did._tag !== "Ok") {
      setFields(before);
      return showToast({ body: `That did not go through. ${did.says}`, uniqueID: "change-failed" });
    }
    log(what);
    tell(what);
    refresh();
  };
  const add = async (text: string) => {
    const did = await api.write("/do", {
      doing: "work.done_when",
      values: { manager, work: view.work.id, checks: [...checks.map((one) => one.says), text].join("\n") },
      key: newId(),
    });
    if (did._tag !== "Ok") return showToast({ body: `That did not go through. ${did.says}`, uniqueID: "add-failed" });
    setAdded((was) => [...was, { id: `added-${was.length}`, text, done: false, by: `Added by ${me?.name ?? "you"}` }]);
    log(`added to done-when: ${text}`);
    tell("a line is added to done-when");
  };
  const body = (
    <VStack gap={6}>
      <AboutSection about={view.work.about} approach={view.approach} />
      <Divider />
      <DoneWhenSection
        items={done}
        onSetDone={(id, isDone) => {
          setTicked((was) => ({ ...was, [id]: isDone }));
          soon("Ticking a line");
        }}
        onAdd={(text) => void add(text)}
      />
      <Divider />
      <EvidenceSection view={view} />
      <Divider />
      <ThreadsSection view={view} />
      <Divider />
      <ActivitySection
        entries={activity}
        manager={name}
        comment={comment}
        onCommentChange={setComment}
        onSend={() => {
          log(comment.trim(), "comment");
          setComment("");
          showToast({ body: `Sent to ${name}.`, uniqueID: "comment" });
        }}
      />
      {/* Narrow screens: the details follow the main column instead of squeezing beside it. */}
      {isNarrow && (
        <>
          <Divider />
          <Heading level={2}>Details</Heading>
          <DetailsPanel view={view} fields={fields} told={view.told} />
        </>
      )}
    </VStack>
  );
  return (
    <Layout
      height="fill"
      contentWidth={1260}
      header={
        <PageHeader
          view={view}
          name={name}
          fields={fields}
          onFieldsChange={(patch, what) => void change(patch, what)}
          isDetailsOpen={isDetailsOpen}
          onToggleDetails={() => setDetailsOpen((one) => !one)}
          isNarrow={isNarrow}
          isTold={isTold}
          onToggleTold={() => {
            setTold((one) => !one);
            showToast({ body: isTold ? "You will not be told when it moves." : "You will be told when it moves.", uniqueID: "told-me" });
          }}
        />
      }
      content={
        <LayoutContent padding={4} role="main">
          {body}
        </LayoutContent>
      }
      end={
        !isNarrow && isDetailsOpen ? (
          <LayoutPanel width={340} padding={4} role="complementary" hasDivider>
            <DetailsPanel view={view} fields={fields} told={view.told} />
          </LayoutPanel>
        ) : undefined
      }
    />
  );
}

export default function TaskPage({ params }: PageProps) {
  const manager = params["manager"] ?? "";
  const read = useRead("/m/:manager/work/:work", params);
  const shell = useRead("/shell");
  const name = shell._tag === "Ok" ? (shell.value.tree.find((one) => one.id === manager)?.name ?? manager) : manager;
  if (read._tag === "Gone") return <Gone work={params["work"] ?? "This"} manager={manager} name={name} />;
  return (
    <Reading from="/m/:manager/work/:work" parts={params} failed="We could not read this piece of work">
      {(view) => <Task view={view} name={name} />}
    </Reading>
  );
}

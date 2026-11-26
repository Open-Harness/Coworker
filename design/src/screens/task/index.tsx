// astryx-template: work-item-detail
import { useState } from "react";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import { Layout, LayoutContent, LayoutPanel, VStack } from "@astryxdesign/core/Layout";
import { Heading } from "@astryxdesign/core/Text";
import { Divider } from "@astryxdesign/core/Divider";
import { useToast } from "@astryxdesign/core/Toast";
import { TASK } from "../../world";
import { ActivitySection, type ActivityEntry } from "./activity";
import { AboutSection } from "./about";
import { LABELS } from "./data";
import { DetailsPanel } from "./details";
import { DoneWhenSection, type DoneItem } from "./done-when";
import { PageHeader, type Fields } from "./header";
import { EvidenceSection, ThreadsSection } from "./lists";

const DONE: DoneItem[] = TASK.doneWhen.map((d, i) => ({ id: i, text: d.text, done: d.done, by: d.by }));
const ACTIVITY: ActivityEntry[] = TASK.activity.map((a, i) => ({ id: i, kind: "event", who: a.who, when: a.when, text: a.text }));

export default function TaskScreen() {
  const showToast = useToast();
  const [fields, setFields] = useState<Fields>({ lane: "building", kind: "bug", answers: "coding", labels: LABELS });
  const [done, setDone] = useState(DONE);
  const [entries, setEntries] = useState(ACTIVITY);
  const [comment, setComment] = useState("");
  const [isTold, setTold] = useState(true);

  // Mobile first: the server render and a shared static copy, which run no
  // script, get the narrow layout, which reads well at every width. Once
  // script runs, wide screens move the details to a rail that can be hidden.
  const isNarrow = useMediaQuery("(max-width: 1024px)", true);
  const [isDetailsOpen, setDetailsOpen] = useState(true);

  const tell = (what: string) => showToast({ body: `Coding is told: ${what}.`, uniqueID: "told" });
  const log = (text: string, kind: ActivityEntry["kind"] = "event") =>
    setEntries((prev) => [{ id: prev.length, kind, who: "Ama Mensah", when: "25 Nov, 09:54", text }, ...prev]);

  return (
    <Layout
      height="fill"
      contentWidth={1260}
      header={
        <PageHeader
          fields={fields}
          onFieldsChange={(patch, what) => { setFields((prev) => ({ ...prev, ...patch })); log(what); tell(what); }}
          isDetailsOpen={isDetailsOpen}
          onToggleDetails={() => setDetailsOpen((o) => !o)}
          isNarrow={isNarrow}
          isTold={isTold}
          onToggleTold={() => { setTold((t) => !t); showToast({ body: isTold ? "You will not be told when it moves." : "You will be told when it moves.", uniqueID: "told-me" }); }}
        />
      }
      content={
        <LayoutContent padding={4} role="main">
          <VStack gap={6}>
            <AboutSection />
            <Divider />
            <DoneWhenSection
              items={done}
              onSetDone={(id, isDone) => { setDone((prev) => prev.map((d) => (d.id === id ? { ...d, done: isDone, by: isDone ? "Ticked by Ama Mensah" : "Not shown yet" } : d))); tell(isDone ? "a line is ticked" : "a line is open again"); }}
              onAdd={(text) => { setDone((prev) => [...prev, { id: prev.length, text, done: false, by: "Added by Ama Mensah" }]); log(`added to done-when: ${text}`); tell("a line is added to done-when"); }}
            />
            <Divider />
            <EvidenceSection />
            <Divider />
            <ThreadsSection />
            <Divider />
            <ActivitySection
              entries={entries}
              comment={comment}
              onCommentChange={setComment}
              onSend={() => { log(comment.trim(), "comment"); setComment(""); showToast({ body: "Sent to Coding.", uniqueID: "comment" }); }}
            />
            {/* Narrow screens: the details follow the main column instead of squeezing beside it. */}
            {isNarrow && (
              <>
                <Divider />
                <Heading level={2}>Details</Heading>
                <DetailsPanel fields={fields} />
              </>
            )}
          </VStack>
        </LayoutContent>
      }
      end={
        !isNarrow && isDetailsOpen ? (
          <LayoutPanel width={340} padding={4} role="complementary" hasDivider>
            <DetailsPanel fields={fields} />
          </LayoutPanel>
        ) : undefined
      }
    />
  );
}

import { useState } from "react";
import { Avatar } from "@astryxdesign/core/Avatar";
import { Badge } from "@astryxdesign/core/Badge";
import { List, ListItem } from "@astryxdesign/core/List";
import { Markdown } from "@astryxdesign/core/Markdown";
import { MetadataList, MetadataListItem } from "@astryxdesign/core/MetadataList";
import { Text } from "@astryxdesign/core/Text";
import { TextArea } from "@astryxdesign/core/TextArea";
import { Timestamp } from "@astryxdesign/core/Timestamp";
import { teamLinks } from "~/modules/team-core/service.ts";
import { PageSection } from "~/modules/ui/service.ts";
import type { BuildApi, TaskPage } from "../types.ts";
import { LeaveGuard } from "./LeaveGuard.tsx";
import { SaveBar } from "./SaveBar.tsx";
import { usePress } from "./use-press.ts";
import { seconds } from "./words.ts";

const STATE = { queued: "Queued", running: "Running", ended: "Ended" } as const;

/** The agents that were on a task, each one's page one click away. */
export function TaskRuns({
  workspaceId,
  managerId,
  task,
}: {
  readonly workspaceId: string;
  readonly managerId: string;
  readonly task: TaskPage;
}) {
  return (
    <PageSection title="Agents on this task">
      {task.runs.length === 0 ? (
        <Text color="secondary">No agent has worked on it yet. Ask the manager in its chat to start one.</Text>
      ) : (
        <List hasDividers edge="flush">
          {task.runs.map((run) => (
            <ListItem
              key={run.id}
              label={`${run.role} · attempt ${run.attempt}`}
              description={run.agent}
              href={teamLinks.run(workspaceId, managerId, run.id)}
              endContent={<Badge variant={run.state === "running" ? "info" : "neutral"} label={STATE[run.state]} />}
            />
          ))}
        </List>
      )}
    </PageSection>
  );
}

/** Why a task is here at all: who asked, how the Gate counted it. */
export function TaskMandate({ task }: { readonly task: TaskPage }) {
  if (task.mandate === undefined) return null;
  const { sender, source, strength, trigger } = task.mandate;
  return (
    <PageSection title="Why this is allowed">
      <MetadataList label={{ position: "top" }}>
        <MetadataListItem label="Asked by">{sender === "" ? "—" : sender}</MetadataListItem>
        <MetadataListItem label="Through">{source === "" ? "—" : source}</MetadataListItem>
        <MetadataListItem label="Strength">{strength === "" ? "—" : strength}</MetadataListItem>
        <MetadataListItem label="Request">{trigger === "" ? "—" : trigger}</MetadataListItem>
      </MetadataList>
    </PageSection>
  );
}

/** What people said on a task, and a box to say more to the manager. */
export function TaskComments({
  api,
  workspaceId,
  managerId,
  task,
  onSaved,
}: {
  readonly api: BuildApi;
  readonly workspaceId: string;
  readonly managerId: string;
  readonly task: TaskPage;
  readonly onSaved: () => void;
}) {
  const [text, setText] = useState("");
  const presser = usePress(api, workspaceId, managerId, onSaved);
  const isDirty = text.trim() !== "";
  return (
    <PageSection title="Comments">
      <LeaveGuard isDirty={isDirty} />
      {task.comments.length === 0 ? (
        <Text color="secondary">No comments yet.</Text>
      ) : (
        <List hasDividers edge="flush">
          {task.comments.map(({ id, by, at, text: words }) => (
            <ListItem
              key={id}
              align="first-line"
              startContent={<Avatar name={by === "" ? "?" : by} size="sm" tooltip={false} />}
              label={by === "" ? "Someone" : by}
              description={
                <Markdown density="compact" headingLevelStart={4}>
                  {words}
                </Markdown>
              }
              endContent={<Timestamp value={seconds(at)} format="relative" />}
            />
          ))}
        </List>
      )}
      <TextArea
        label="Comment"
        description="It goes to the manager, which passes it on if an agent needs it."
        rows={3}
        value={text}
        onChange={setText}
        width="100%"
      />
      <SaveBar
        state={presser.saver.state}
        isDirty={isDirty}
        label="Comment"
        onSave={async () => {
          if ((await presser.press("task.comment", { task: task.id, text: text.trim() })) !== "failed") setText("");
        }}
        onDiscard={() => {
          setText("");
          presser.saver.reset();
        }}
      />
    </PageSection>
  );
}

/** What happened on a task, each thing in its own sentence. */
export function TaskHistory({ task }: { readonly task: TaskPage }) {
  return (
    <PageSection title="History">
      {task.history.length === 0 ? (
        <Text color="secondary">Nothing has happened yet.</Text>
      ) : (
        <List hasDividers edge="flush" density="compact">
          {task.history.map(({ at, sentence }) => (
            <ListItem key={`${at}-${sentence}`} label={sentence} endContent={<Timestamp value={seconds(at)} format="relative" />} />
          ))}
        </List>
      )}
    </PageSection>
  );
}

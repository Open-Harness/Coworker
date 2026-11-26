import { useState } from "react";
import { VStack } from "@astryxdesign/core/Layout";
import { TextArea } from "@astryxdesign/core/TextArea";
import { TextInput } from "@astryxdesign/core/TextInput";
import type { BuildApi, TaskPage } from "../types.ts";
import { LeaveGuard } from "./LeaveGuard.tsx";
import { SaveBar } from "./SaveBar.tsx";
import { usePress } from "./use-press.ts";

/** A task's title and what it is about. */
export function TaskTextForm({
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
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const presser = usePress(api, workspaceId, managerId, onSaved);
  const isDirty = title !== task.title || description !== task.description;
  return (
    <VStack gap={3}>
      <LeaveGuard isDirty={isDirty} />
      <TextInput label="Title" value={title} onChange={setTitle} width="100%" isRequired />
      <TextArea label="Description" rows={6} value={description} onChange={setDescription} width="100%" />
      <SaveBar
        state={presser.saver.state}
        isDirty={isDirty}
        isReady={title.trim() !== ""}
        label="Save title and description"
        onSave={async () => void (await presser.press("task.update", { task: task.id, title: title.trim(), description }))}
        onDiscard={() => {
          setTitle(task.title);
          setDescription(task.description);
          presser.saver.reset();
        }}
      />
    </VStack>
  );
}

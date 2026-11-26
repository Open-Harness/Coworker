import type { CommitPublication } from "@earendil-works/pi-durable";
import { UsageDoc } from "@earendil-works/pi-durable";
import { SettingsDoc } from "~/modules/agent/service.ts";
import { ChatIndex } from "~/modules/chats/service.ts";
import { DocumentIndex } from "~/modules/documents/service.ts";
import { DeliverInstruction } from "~/modules/schedule/service.ts";

/** Parts of the workspace's state that pages show beside the chat. */
export type Slice = "settings" | "usage" | "documents" | "schedules" | "chats";

const SLICE_OF_DOCUMENT: Readonly<Record<string, Slice>> = {
  [ChatIndex.definition.kind]: "chats",
  [DocumentIndex.definition.kind]: "documents",
  [UsageDoc.definition.kind]: "usage",
  [SettingsDoc.definition.kind]: "settings",
};

/** Which parts a commit may have changed. */
export function changedSlices(publication: CommitPublication): ReadonlySet<Slice> {
  const slices = new Set<Slice>();
  for (const change of publication.changes) {
    if (change.type === "document") {
      const slice = SLICE_OF_DOCUMENT[change.record.kind];
      if (slice !== undefined) slices.add(slice);
    }
    if (change.type === "task" && change.value.kind === DeliverInstruction.definition.name) slices.add("schedules");
  }
  return slices;
}

import { ArrowPathIcon, CheckCircleIcon, ClipboardDocumentCheckIcon, InboxIcon, UserIcon } from "@heroicons/react/24/outline";
import { LANES, WORK, type Kind, type Lane, type Work } from "../../world";

export type ColumnId = Lane;
export type Item = Work;

export interface ColumnMeta {
  id: ColumnId;
  title: string;
  variant: "neutral" | "accent" | "warning" | "success";
  tooltip: string;
  emptyTitle: string;
  emptyDescription: string;
  emptyIcon: typeof InboxIcon;
}

const LOOK: Record<ColumnId, Pick<ColumnMeta, "variant" | "emptyTitle" | "emptyDescription" | "emptyIcon">> = {
  triage: { variant: "neutral", emptyTitle: "Triage is empty", emptyDescription: "New work lands here first.", emptyIcon: InboxIcon },
  building: { variant: "accent", emptyTitle: "Nothing being built", emptyDescription: "Work a thread is writing appears here.", emptyIcon: ArrowPathIcon },
  checking: { variant: "accent", emptyTitle: "Nothing being checked", emptyDescription: "Finished work waits here for a fresh look.", emptyIcon: ClipboardDocumentCheckIcon },
  person: { variant: "warning", emptyTitle: "Nothing with a person", emptyDescription: "Reviews and questions appear here.", emptyIcon: UserIcon },
  done: { variant: "success", emptyTitle: "Nothing done yet", emptyDescription: "Merged or closed work appears here.", emptyIcon: CheckCircleIcon },
};

export const COLUMNS: ColumnMeta[] = LANES.map((l) => ({ id: l.id, title: l.name, tooltip: l.tip, ...LOOK[l.id] }));
export const INITIAL_ITEMS: Item[] = [...WORK];

export const KIND_VARIANT: Record<Kind, "neutral"> = { Bug: "neutral", Feature: "neutral", Upkeep: "neutral" };
export const laneName = (id: ColumnId): string => COLUMNS.find((c) => c.id === id)?.title ?? id;

// Pointer travel (px) before a press is promoted to a drag, so taps and clicks
// on card controls still register normally.
export const DRAG_THRESHOLD = 5;

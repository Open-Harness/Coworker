/* Facts about ACME-412 that world.ts does not carry: the label tokens and the options of the three selectors. */
import { LANES } from "../../world";

export const LABELS = [
  { id: "export", label: "Export", color: "gray" as const },
  { id: "northwind", label: "Northwind", color: "gray" as const },
  { id: "memory", label: "Memory", color: "gray" as const },
];
export type LabelOption = (typeof LABELS)[number];

export const LANE_DOTS = { triage: "neutral", building: "accent", checking: "warning", person: "warning", done: "success" } as const;
export const LANE_OPTIONS = LANES.map((l) => ({ value: l.id, label: l.name }));
export const KIND_OPTIONS = ["Bug", "Feature", "Upkeep"].map((k) => ({ value: k.toLowerCase(), label: k }));
/** Who answers for the piece of work: the manager by default, or a person. */
export const ANSWER_OPTIONS = ["Coding", "Ama Mensah", "Chidi Okafor", "Bo Larsen"].map((n) => ({ value: n.toLowerCase().replaceAll(" ", "-"), label: n }));

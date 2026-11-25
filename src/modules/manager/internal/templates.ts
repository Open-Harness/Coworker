import type { Field, Lane, TemplateId, View } from "../types.ts";
import type { OwnPermissions } from "./state.ts";

export interface Template {
  readonly lanes: readonly Lane[];
  readonly fields: readonly Field[];
  readonly defaultView: View;
  /** What a manager of this kind is for, until someone says it better. */
  readonly purpose: string;
  /** What this kind of manager may do beyond the catalogue's defaults. */
  readonly permissions: OwnPermissions;
}

const lane = (id: string, name: string, meaning: string, needsApproval = false): Lane => ({ id, name, meaning, needsApproval });

/** The mission page a manager starts with. */
export const missionPage = (name: string, purpose: string): string =>
  [
    `# ${name}`,
    "",
    "## What this manager is for",
    "",
    purpose,
    "",
    "## How it works",
    "",
    "Write in the chat or email it. It keeps the board.",
  ].join("\n");

export const TEMPLATES: Readonly<Record<TemplateId, Template>> = {
  kanban: {
    lanes: [
      lane("todo", "To do", "Accepted, not started"),
      lane("doing", "Doing", "An agent or a person is on it"),
      lane("review", "Review", "Done, waiting for a person to check", true),
      lane("done", "Done", "Finished and checked"),
    ],
    fields: [
      {
        key: "priority",
        label: "Priority",
        type: "select",
        options: [{ value: "high", tone: "red" }, { value: "normal" }, { value: "low", tone: "green" }],
      },
    ],
    defaultView: "kanban",
    purpose: "Ship the team's work: take requests, split them into tasks, and run agents on them.",
    permissions: { categories: {}, actions: {} },
  },
  incident: {
    lanes: [
      lane("triage", "Triage", "Reported, not yet confirmed"),
      lane("investigating", "Investigating", "Confirmed, looking for the cause"),
      lane("mitigated", "Mitigated", "Impact stopped, root cause open"),
      lane("resolved", "Resolved", "Closed, with a review written", true),
    ],
    fields: [
      {
        key: "severity",
        label: "Severity",
        type: "select",
        options: [{ value: "SEV1", tone: "red" }, { value: "SEV2", tone: "amber" }, { value: "SEV3" }],
      },
      { key: "service", label: "Service", type: "text" },
    ],
    defaultView: "console",
    purpose: "Run incidents: confirm what is broken, find who is on call, and keep everyone updated.",
    permissions: { categories: {}, actions: { "message.new": "on" } },
  },
  support: {
    lanes: [
      lane("new", "New", "Arrived, not answered"),
      lane("waiting", "Waiting", "Answered, waiting for the customer"),
      lane("solved", "Solved", "The customer has what they needed"),
    ],
    fields: [{ key: "customer", label: "Customer", type: "text" }],
    defaultView: "inbox",
    purpose: "Answer customers: reply where they wrote, and hand hard questions to a person.",
    permissions: { categories: {}, actions: {} },
  },
  research: {
    lanes: [
      lane("asked", "Asked", "A question nobody has looked into"),
      lane("looking", "Looking", "Being researched"),
      lane("check", "Check", "Written up, waiting for a person to read", true),
      lane("answered", "Answered", "The short report is out"),
    ],
    fields: [{ key: "asked-by", label: "Asked by", type: "text" }],
    defaultView: "list",
    purpose: "Answer questions: look into each one and write a short report that says where every claim comes from.",
    permissions: { categories: {}, actions: {} },
  },
};

export const isTemplate = (value: unknown): value is TemplateId => typeof value === "string" && Object.hasOwn(TEMPLATES, value);

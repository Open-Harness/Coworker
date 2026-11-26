import type { TemplateCard, TemplateId } from "../types.ts";
import { TEMPLATES } from "./templates.ts";

/** What the gallery says of each template beyond what it holds. */
const ABOUT: Readonly<Record<TemplateId, { readonly name: string; readonly about: string }>> = {
  kanban: { name: "Kanban board", about: "Ships the team's work: takes requests, splits them into tasks and runs agents on them." },
  incident: { name: "Incident desk", about: "Runs incidents: confirms what is broken, finds who is on call and keeps everyone updated." },
  support: { name: "Support inbox", about: "Answers customers where they wrote, and hands hard questions to a person." },
  research: { name: "Research desk", about: "Answers questions: looks into each one and writes a short report with its sources." },
};

/** The templates a manager can start from, as the gallery shows them: lanes, fields, first view and what it may do. */
export const templateCards = (): readonly TemplateCard[] =>
  (Object.keys(TEMPLATES) as TemplateId[]).map((id) => {
    const template = TEMPLATES[id];
    return {
      id,
      ...ABOUT[id],
      opensOn: template.defaultView,
      lanes: template.lanes.map((lane) => ({ ...lane })),
      fields: template.fields.map((field) => structuredClone(field)),
      permissions: { categories: { ...template.permissions.categories }, actions: { ...template.permissions.actions } },
    };
  });

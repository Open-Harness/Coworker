import type { FieldDefinition } from "@astryxdesign/core/PowerSearch";
import type { PowerSearchConfig, PowerSearchFilter } from "@astryxdesign/core/PowerSearch";
import type { AuditControls } from "../types.ts";
import { NO_FILTERS, RANGES } from "./audit-filters.ts";
import { categoryLabel } from "./roles-words.ts";

/** The six things the audit log narrows by, which are the fields of its search; each is one value, and `is` is the one way to say it. */
type Field = keyof AuditControls;
const FIELDS: readonly Field[] = ["kind", "manager", "category", "permission", "outcome", "range"];

const LABEL: Readonly<Record<Field, string>> = {
  kind: "Who",
  outcome: "Outcome",
  manager: "Where",
  category: "Category",
  permission: "Ran under",
  range: "When",
};

const OPTIONS = (
  managers: Readonly<Record<string, string>>,
  categories: readonly string[],
): Readonly<Record<Field, readonly { value: string; label: string }[]>> => ({
  kind: [
    { value: "person", label: "People" },
    { value: "manager", label: "Managers" },
  ],
  outcome: [
    { value: "done", label: "Done" },
    { value: "asked", label: "Asked first" },
    { value: "refused", label: "Refused" },
    { value: "failed", label: "Failed" },
  ],
  manager: [{ value: "workspace", label: "The workspace itself" }, ...Object.entries(managers).map(([value, label]) => ({ value, label }))],
  category: [...categories.map((value) => ({ value, label: categoryLabel(value) })), { value: "settings", label: "Settings" }],
  permission: [
    { value: "on", label: "On" },
    { value: "ask", label: "Ask" },
    { value: "off", label: "Off" },
  ],
  range: Object.entries(RANGES)
    .filter(([value]) => value !== "all")
    .map(([value, { label }]) => ({ value, label })),
});

/** Field definitions for `usePowerSearchConfig`: who, outcome, where, category, permission and when. */
export const fieldDefinitions = (managers: Readonly<Record<string, string>>, categories: readonly string[]): FieldDefinition[] =>
  FIELDS.map((key) => ({ key, type: "enum", label: LABEL[key], enumValues: OPTIONS(managers, categories)[key] }));

/** The server takes one value for each field, so a field offers `is` alone: no "is not", no "any of". */
export const onlyIs = (config: PowerSearchConfig): PowerSearchConfig => ({
  ...config,
  fields: config.fields.map((field) => ({
    ...field,
    defaultOperator: "is",
    operators: field.operators.filter(({ key }) => key === "is"),
  })),
});

/** What the search shows for the controls: a token for each that narrows. */
export function searchOf(controls: AuditControls): PowerSearchFilter[] {
  return FIELDS.filter((field) => controls[field] !== NO_FILTERS[field]).map((field) => ({
    field,
    operator: "is",
    value: { type: "enum", value: controls[field] },
  }));
}

/** The controls for what the search shows. A field said twice keeps the last; one the bar does not know is ignored. */
export function controlsOf(filters: readonly PowerSearchFilter[]): AuditControls {
  let controls = NO_FILTERS;
  for (const { field, value } of filters) {
    // Each value came from the field's own options, which are the controls' own words.
    if (FIELDS.includes(field as Field) && value.type === "enum") controls = { ...controls, [field]: value.value };
  }
  return controls;
}

import { arr, bool, int, map, nullable, obj, oneOf, opt, str, unknown } from "@earendil-works/pi-schema";

const task = str({ description: "The task, such as DT-14" });
const lane = str({ description: "A lane id or name" });
const option = obj({ value: str({ minLength: 1, maxLength: 40 }), tone: opt(oneOf(["red", "amber", "green"])) });
const permission = nullable(oneOf(["on", "off", "ask"]), { description: "null takes your own setting away" });

/** The input of the board's settings, a task's values and comments, and the manager's own Permissions. */
export const BOARD_PARAMETERS: Readonly<Record<string, object>> = {
  "lane.create": obj({
    name: str({ minLength: 1, maxLength: 40 }),
    meaning: opt(str({ maxLength: 200 })),
    needsApproval: opt(bool({ description: "A person must approve a task leaving this lane" })),
    limit: opt(int({ minimum: 1, maximum: 1000, description: "At most this many tasks" })),
  }),
  "lane.update": obj({
    lane,
    name: opt(str({ minLength: 1, maxLength: 40 })),
    meaning: opt(str({ maxLength: 200 })),
    needsApproval: opt(bool()),
    limit: opt(nullable(int({ minimum: 1, maximum: 1000 }), { description: "null for no limit" })),
  }),
  "lane.reorder": obj({ order: arr(str(), { description: "Every lane id, in the new order" }) }),
  "lane.delete": obj({ lane }),
  "field.create": obj({
    label: str({ minLength: 1, maxLength: 40 }),
    type: oneOf(["select", "text", "number", "date", "person"]),
    options: opt(arr(option, { maxItems: 20, description: "For a select field" })),
  }),
  "field.update": obj({
    field: str({ description: "The field's key" }),
    label: opt(str({ minLength: 1, maxLength: 40 })),
    options: opt(arr(option, { maxItems: 20 })),
  }),
  "field.delete": obj({ field: str({ description: "The field's key" }) }),
  "view.default": obj({ view: oneOf(["kanban", "list", "console", "inbox"]) }),
  "task.values": obj({ task, values: map(unknown(), { description: "{field key: value}. null clears a value" }) }),
  "task.owner": obj({
    task,
    owner: nullable(str({ maxLength: 120 }), { description: "A person id such as email:ama@acme.com, or null for none" }),
  }),
  "task.comment": obj({ task, text: str({ minLength: 1, maxLength: 10_000 }) }),
  "self.permissions": obj({
    categories: opt(map(permission, { description: "{category: on, off, ask or null}" })),
    actions: opt(map(permission, { description: "{action id: on, off, ask or null}" })),
    reset: opt(bool({ description: "Go back to the template's Permissions" })),
  }),
};

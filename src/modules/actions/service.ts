import { CATALOGUE } from "./internal/catalogue.ts";
import { describe } from "./internal/describe.ts";
import { check } from "./internal/permissions.ts";
import type { ActionRecord, Actions, ActionsDependencies, CallResult, Permission } from "./types.ts";

export { CATALOGUE } from "./internal/catalogue.ts";
export { PRESETS } from "./internal/permissions.ts";
export { CATEGORY_DEFAULTS } from "./internal/catalogue.ts";

const byId = new Map(CATALOGUE.map((spec) => [spec.id, spec]));

export function createActions({ sources, handlers, audit, clock }: ActionsDependencies): Actions {
  const record = (fields: Omit<ActionRecord, "at">): void => audit({ ...fields, at: clock.now() });
  return {
    catalogue: CATALOGUE,
    check: (by, actionId) => {
      const spec = byId.get(actionId);
      return spec === undefined ? "off" : check(sources, by, spec);
    },
    describe: (actionId, input, by) => {
      const spec = byId.get(actionId);
      return spec === undefined ? actionId : describe(spec, input, by);
    },
    call: async (actionId, input, by, approvedBy): Promise<CallResult> => {
      const spec = byId.get(actionId);
      if (spec === undefined) return { _tag: "Unknown", action: actionId };
      const permission: Permission = check(sources, by, spec);
      const sentence = describe(spec, input, by);
      const line = { action: actionId, input, by, permission, sentence, ...(approvedBy === undefined ? {} : { approvedBy }) };
      if (permission === "off") {
        record({ ...line, outcome: "refused" });
        return { _tag: "Refused", reason: `${spec.label} is turned off for ${by.name}` };
      }
      if (permission === "ask" && approvedBy === undefined) {
        record({ ...line, outcome: "asked" });
        return { _tag: "Ask", sentence };
      }
      const handler = handlers[actionId];
      if (handler === undefined) {
        record({ ...line, outcome: "failed" });
        return { _tag: "Failed", message: `${spec.label} is not available yet` };
      }
      try {
        const value = await handler(input, by);
        record({ ...line, outcome: "done" });
        return { _tag: "Done", value };
      } catch (error) {
        record({ ...line, outcome: "failed" });
        return { _tag: "Failed", message: error instanceof Error ? error.message : String(error) };
      }
    },
  };
}

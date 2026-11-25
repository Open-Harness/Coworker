import { createActions } from "~/modules/actions/service.ts";
import type { By } from "~/modules/actions/types.ts";
import type { Allow } from "~/modules/triggers/types.ts";
import type { SettingsApi, SettingsPlace } from "../types.ts";

/**
 * Who may ask a manager is changed in one place, the Workspace's policy, whether by a button or a PUT. Each change it
 * makes leaves the line the matching catalogue action would: the same sentence, under the same action id.
 */

const labelOf = (allow: Allow): string =>
  allow.kind === "person" ? allow.person : allow.kind === "domain" ? `*@${allow.domain}` : `${allow.handle.kind}:${allow.handle.id}`;

const keyOf = (allow: Allow): string => `${allow.kind}:${labelOf(allow)}`;

export function auditPolicy(
  place: SettingsPlace,
  input: Parameters<SettingsApi["policyChanged"]>[0],
  by: By,
): { readonly _tag: "Noted"; readonly lines: number } {
  const entry = place.roster.find(({ managerId }) => managerId === input.managerId);
  if (entry === undefined) return { _tag: "Noted", lines: 0 };
  const { before, after } = input;
  const actions = createActions({
    sources: { manager: () => ({ categories: {}, actions: {} }), person: () => undefined },
    handlers: {},
    audit: () => undefined,
    clock: place.clock,
  });
  const lines: { readonly id: string; readonly input: Readonly<Record<string, unknown>> }[] = [];
  const [was, now] = [
    new Map(before.allowed.map((allow) => [keyOf(allow), allow])),
    new Map(after.allowed.map((allow) => [keyOf(allow), allow])),
  ];
  for (const [key, allow] of now) if (!was.has(key)) lines.push({ id: "allow.add", input: { who: `${labelOf(allow)} on ${entry.name}` } });
  for (const [key, allow] of was)
    if (!now.has(key)) lines.push({ id: "allow.remove", input: { who: `${labelOf(allow)} on ${entry.name}` } });
  if (before.acceptMode !== after.acceptMode) lines.push({ id: "accept.mode", input: { mode: after.acceptMode } });
  const scopes = new Set([...Object.keys(before.admission), ...Object.keys(after.admission)]);
  for (const scope of [...scopes].sort())
    if (before.admission[scope] !== after.admission[scope]) lines.push({ id: "admission.update", input: { scope } });
  if (JSON.stringify(before.bots) !== JSON.stringify(after.bots)) lines.push({ id: "bots.update", input: {} });
  for (const line of lines) {
    place.audit(
      {
        action: line.id,
        input: line.input,
        by,
        at: place.clock.now(),
        permission: "on",
        sentence: actions.describe(line.id, line.input, by),
        outcome: "done",
      },
      entry.managerId,
    );
  }
  return { _tag: "Noted", lines: lines.length };
}

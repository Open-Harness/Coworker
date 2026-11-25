import type { By } from "~/modules/actions/types.ts";
import type { SettingsPlace } from "../types.ts";

/** One audit line for a change made in Settings: the sentence names who did it, and it ran under their role's `on`. */
export function said(place: SettingsPlace, by: By, action: string, sentence: string, managerId = ""): void {
  place.audit({ action, input: {}, by, at: place.clock.now(), permission: "on", sentence, outcome: "done" }, managerId);
}

import { defineDoc } from "@earendil-works/pi-durable";
import type { SettingsChange, WorkspaceSettings } from "~/modules/protocol/types.ts";

type Stored = {
  model?: { provider: string; modelId: string };
  thinkingLevel: WorkspaceSettings["thinkingLevel"];
  instructions: string;
  budgetUsd?: number;
  maxTurns: number;
};

export const DEFAULT_MAX_TURNS = 50;

export const SettingsDoc = defineDoc<Stored>({
  kind: "app.settings",
  version: 1,
  scope: "session",
  initial: () => ({ thinkingLevel: "off", instructions: "", maxTurns: DEFAULT_MAX_TURNS }),
  checkpointWhen: () => true,
});

export const toSettings = (stored: Readonly<Stored> | undefined): WorkspaceSettings => ({
  thinkingLevel: stored?.thinkingLevel ?? "off",
  instructions: stored?.instructions ?? "",
  maxTurns: stored?.maxTurns ?? DEFAULT_MAX_TURNS,
  ...(stored?.model === undefined ? {} : { model: { ...stored.model } }),
  ...(stored?.budgetUsd === undefined ? {} : { budgetUsd: stored.budgetUsd }),
});

export function applyChange(stored: Stored, change: SettingsChange): void {
  if (change.model !== undefined) stored.model = { ...change.model };
  if (change.thinkingLevel !== undefined) stored.thinkingLevel = change.thinkingLevel;
  if (change.instructions !== undefined) stored.instructions = change.instructions;
  if (change.maxTurns !== undefined) stored.maxTurns = change.maxTurns;
  if (change.budgetUsd === null) delete stored.budgetUsd;
  else if (change.budgetUsd !== undefined) stored.budgetUsd = change.budgetUsd;
}

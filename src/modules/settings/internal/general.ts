import type { By } from "~/modules/actions/types.ts";
import type { GeneralView, Invalid, ModelChoice, ModelOption, Saved, SettingsApi, SettingsPlace } from "../types.ts";
import { isRecord, readSetting, writeSetting } from "./store.ts";
import { said } from "./said.ts";

/** The workspace's own record: its name, time zone and default model. The logo has its own file. */
interface Stored {
  readonly timeZone?: string;
  readonly defaultModel?: ModelChoice;
}

const stored = (place: Pick<SettingsPlace, "sql">): Stored => {
  const value = readSetting(place.sql, "general");
  const defaultModel = isRecord(value) && isRecord(value["defaultModel"]) ? value["defaultModel"] : undefined;
  return {
    ...(isRecord(value) && typeof value["timeZone"] === "string" ? { timeZone: value["timeZone"] } : {}),
    ...(typeof defaultModel?.["connectionId"] === "string" && typeof defaultModel["model"] === "string"
      ? { defaultModel: { connectionId: defaultModel["connectionId"], model: defaultModel["model"] } }
      : {}),
  };
};

/** The workspace's default model, as saved. It need not still work: the route says so when it does not. */
export const defaultModelOf = (sql: SqlStorage): ModelChoice | undefined => stored({ sql }).defaultModel;

export const validZone = (zone: string): boolean => {
  if (zone.length > 64 || !/^[A-Za-z0-9_+\-/]+$/u.test(zone)) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: zone });
    return true;
  } catch {
    return false;
  }
};

const optionsOf = (place: SettingsPlace): readonly ModelOption[] =>
  place.models
    .list()
    .filter(({ check }) => check._tag === "Works")
    .map(({ id, label, models }) => ({ connectionId: id, label, models }));

export const hasLogo = (place: SettingsPlace): boolean => place.sql.exec("SELECT 1 FROM logo").toArray().length > 0;

export function viewOf(place: SettingsPlace): GeneralView {
  const { profile } = place;
  const { timeZone, defaultModel } = stored(place);
  return {
    workspaceId: profile.workspaceId,
    name: profile.name,
    address: profile.address,
    mailDomain: place.mailDomain,
    region: profile.region,
    createdAt: profile.createdAt,
    timeZone: timeZone ?? "UTC",
    defaultModel: defaultModel ?? null,
    choices: optionsOf(place),
    hasLogo: hasLogo(place),
  };
}

/** The default must be a model one of the workspace's working connections lists. */
export function choiceProblem(place: SettingsPlace, choice: ModelChoice): string | undefined {
  const found = optionsOf(place).find(({ connectionId }) => connectionId === choice.connectionId);
  if (found === undefined) return "That connection is not one of the workspace's working connections";
  return found.models.includes(choice.model) ? undefined : `${found.label} does not list ${choice.model}`;
}

export function setGeneral(place: SettingsPlace, input: Parameters<SettingsApi["setGeneral"]>[0], by: By): Saved<GeneralView> | Invalid {
  const before = stored(place);
  if (input.timeZone !== undefined && !validZone(input.timeZone))
    return { _tag: "Invalid", reason: `${input.timeZone} is not a time zone` };
  if (input.defaultModel !== undefined && input.defaultModel !== null) {
    const problem = choiceProblem(place, input.defaultModel);
    if (problem !== undefined) return { _tag: "Invalid", reason: problem };
  }
  const next: Stored = {
    ...(input.timeZone === undefined ? (before.timeZone === undefined ? {} : { timeZone: before.timeZone }) : { timeZone: input.timeZone }),
    ...(input.defaultModel === undefined
      ? before.defaultModel === undefined
        ? {}
        : { defaultModel: before.defaultModel }
      : input.defaultModel === null
        ? {}
        : { defaultModel: input.defaultModel }),
  };
  writeSetting(place.sql, "general", next);
  if (input.timeZone !== undefined && input.timeZone !== before.timeZone)
    said(place, by, "settings.zone", `${by.name} set the workspace time zone to ${input.timeZone}`);
  if (input.defaultModel !== undefined)
    said(
      place,
      by,
      "settings.model",
      input.defaultModel === null
        ? `${by.name} cleared the default model for new agents`
        : `${by.name} made ${input.defaultModel.model} the default model for new agents`,
    );
  return { _tag: "Saved", value: viewOf(place) };
}

/** Everything that leaves the profile alone: a model removed takes its default with it. */
export function forgetModel(place: SettingsPlace, connectionId: string): void {
  const { defaultModel, timeZone } = stored(place);
  if (defaultModel?.connectionId === connectionId) writeSetting(place.sql, "general", timeZone === undefined ? {} : { timeZone });
}

import type { ModelApi, ModelConnection, ModelPick, ModelRoute, Readiness } from "../types.ts";
import { listConnections } from "./store.ts";

const NO_MODEL = "No model is connected. Add a provider key, your own endpoint or ChatGPT under Settings → Keys.";

/** Whether a manager may start: the first connection whose last test call worked, or why none does. */
export function readinessOf(sql: SqlStorage): Readiness {
  const connections = listConnections(sql);
  const working = connections.find((connection) => connection.check._tag === "Works");
  if (working !== undefined) return { _tag: "Ready", connection: working };
  const failed = connections.flatMap((connection) =>
    connection.check._tag === "Failed" ? [`${connection.label}: ${connection.check.error}`] : [],
  );
  return failed.length === 0
    ? { _tag: "NoModel", reason: NO_MODEL }
    : { _tag: "NoModel", reason: `No connected model works. ${failed.join("; ")}` };
}

/** Anthropic's own format for Anthropic keys; OpenAI chat completions for OpenAI, ChatGPT and any endpoint, as the test call does. */
export const apiOf = (connection: ModelConnection): ModelApi =>
  connection.source === "anthropic" ? "anthropic-messages" : "openai-completions";

/** What a manager is not meant to think with: small, speech, image and embedding models. */
const NOT_FOR_MANAGERS = /mini|nano|haiku|embed|whisper|tts|image|audio|moderation|realtime|transcribe|search|dall-e/u;

/**
 * The connection's model when nobody chose one. An endpoint is the workspace's own server, so its first model;
 * Anthropic's Sonnet if listed; otherwise the first that is not a small or special-purpose model.
 */
export function chooseModel(connection: ModelConnection): string | undefined {
  const { models } = connection;
  if (connection.source === "anthropic") return models.find((model) => model.includes("sonnet")) ?? models[0];
  if (connection.source === "endpoint") return models[0];
  return models.find((model) => !NOT_FOR_MANAGERS.test(model)) ?? models[0];
}

const routeTo = (connection: ModelConnection, model?: string, notice?: string): ModelRoute => ({
  _tag: "Route",
  connectionId: connection.id,
  label: connection.label,
  source: connection.source,
  api: apiOf(connection),
  ...(model === undefined ? {} : { model }),
  ...(notice === undefined ? {} : { notice }),
});

/** Why a choice cannot be used now, or undefined when it can. */
function unusable(found: ModelConnection | undefined, pick: ModelPick): string | undefined {
  if (found === undefined) return "its connection was removed";
  if (found.check._tag !== "Works") return `${found.label} is not working: ${found.check.error}`;
  return found.models.includes(pick.model) ? undefined : `${found.label} no longer lists it`;
}

const instead = (missed: readonly string[], connection: ModelConnection, model: string | undefined): string =>
  `${missed.join(" ")} ${model ?? "A model"} on ${connection.label} answered instead.`;

/**
 * docs/model.md does not say which connection or model a manager uses, so, in order: the choice made for this caller (an
 * agent's), the workspace's default model, then the first working connection. A choice that cannot be used is skipped
 * and said so in the route's `notice`, never silently.
 */
export function routeOf(sql: SqlStorage, wanted?: ModelPick, fallback?: ModelPick): ModelRoute {
  const ready = readinessOf(sql);
  if (ready._tag === "NoModel") return ready;
  const connections = listConnections(sql);
  const missed: string[] = [];
  const choices: readonly (readonly [string, ModelPick | undefined])[] = [
    ["The chosen model", wanted],
    ["The workspace's default model", fallback],
  ];
  for (const [whose, pick] of choices) {
    if (pick === undefined) continue;
    const found = connections.find(({ id }) => id === pick.connectionId);
    const why = unusable(found, pick);
    if (why === undefined && found !== undefined)
      return routeTo(found, pick.model, missed.length === 0 ? undefined : instead(missed, found, pick.model));
    missed.push(`${whose} ${pick.model} cannot be used (${why ?? "unknown"}).`);
  }
  const { connection } = ready;
  if (missed.length === 0) return routeTo(connection);
  const model = chooseModel(connection);
  return routeTo(connection, model, instead(missed, connection, model));
}

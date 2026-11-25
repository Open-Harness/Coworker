import type { AddEndpoint, AddKey, AddResult, Check, ModelConnection, ModelsDependencies } from "../types.ts";
import { probeAnthropic, probeOpenAICompatible, type Probe } from "./probe.ts";
import { saveConnection } from "./store.ts";

/** Google and OpenCode both answer in OpenAI's shape at these addresses. */
export const BASE_URLS = {
  anthropic: "https://api.anthropic.com",
  openai: "https://api.openai.com/v1",
  google: "https://generativelanguage.googleapis.com/v1beta/openai",
  opencode: "https://opencode.ai/zen/v1",
} as const;
const LABELS = { anthropic: "Anthropic", openai: "OpenAI", google: "Google", opencode: "OpenCode" } as const;

/** The vault entry that holds a connection's key or tokens. */
export const secretName = (id: string): string => `model:${id}`;

const toCheck = (probe: Probe, checkedAt: number): Check =>
  probe._tag === "Works" ? { _tag: "Works", checkedAt } : { _tag: "Failed", checkedAt, error: probe.error };

/** Runs the test call for a connection, with its key read from the vault for that call only. */
export async function test(dependencies: ModelsDependencies, connection: ModelConnection): Promise<ModelConnection> {
  const { vault, fetch: send, clock } = dependencies;
  const used = await vault.use(secretName(connection.id), (key) =>
    connection.source === "anthropic"
      ? probeAnthropic(send, connection.baseUrl, key)
      : probeOpenAICompatible(send, connection.baseUrl, key === "" ? undefined : key),
  );
  const probe: Probe = used._tag === "Used" ? used.value : { _tag: "Failed", error: "The stored key could not be read. Add it again" };
  return { ...connection, models: probe._tag === "Works" ? probe.models : connection.models, check: toCheck(probe, clock.now()) };
}

async function connect(
  dependencies: ModelsDependencies,
  draft: Omit<ModelConnection, "check" | "models">,
  key: string,
): Promise<AddResult> {
  await dependencies.vault.put(secretName(draft.id), key);
  const tested = await test(dependencies, { ...draft, models: [], check: { _tag: "Failed", checkedAt: 0, error: "Not checked yet" } });
  saveConnection(dependencies.sql, tested, dependencies.clock.now());
  return { _tag: "Added", connection: tested };
}

export function addKey(dependencies: ModelsDependencies, input: AddKey): Promise<AddResult> {
  const key = input.key.trim();
  if (key === "") return Promise.resolve({ _tag: "Invalid", reason: "Paste a key" });
  const id = dependencies.ids.next(input.source);
  const label = input.label?.trim() || LABELS[input.source];
  return connect(dependencies, { id, source: input.source, label, baseUrl: BASE_URLS[input.source] }, key);
}

export function addEndpoint(dependencies: ModelsDependencies, input: AddEndpoint): Promise<AddResult> {
  const baseUrl = input.baseUrl.trim().replace(/\/+$/u, "");
  if (!URL.canParse(baseUrl) || new URL(baseUrl).protocol !== "https:") {
    return Promise.resolve({ _tag: "Invalid", reason: "Use the endpoint's https:// address, such as https://models.example.com/v1" });
  }
  const label = input.label.trim() || new URL(baseUrl).host;
  return connect(dependencies, { id: dependencies.ids.next("endpoint"), source: "endpoint", label, baseUrl }, input.key?.trim() ?? "");
}

import type { AddResult, ModelConnection, ModelsDependencies } from "../types.ts";
import { secretName, test } from "./connect.ts";
import { findConnection, saveConnection } from "./store.ts";

/** Puts a connection's key or address right and tests it again; what the Keys screen's Replace and Edit do. */
export interface Change {
  readonly label?: string | undefined;
  readonly baseUrl?: string | undefined;
  readonly key?: string | undefined;
}

export async function change(dependencies: ModelsDependencies, id: string, edit: Change): Promise<AddResult | undefined> {
  const { sql, vault, clock } = dependencies;
  const found = findConnection(sql, id);
  if (found === undefined) return undefined;
  if (found.source === "chatgpt") return { _tag: "Invalid", reason: "A ChatGPT sign-in has no key to change. Sign in again" };
  if (found.source !== "endpoint" && (edit.label !== undefined || edit.baseUrl !== undefined))
    return { _tag: "Invalid", reason: "Only an own endpoint has an address and a name to edit" };
  const baseUrl = edit.baseUrl === undefined ? found.baseUrl : edit.baseUrl.trim().replace(/\/+$/u, "");
  if (!URL.canParse(baseUrl) || new URL(baseUrl).protocol !== "https:")
    return { _tag: "Invalid", reason: "Use the endpoint's https:// address, such as https://models.example.com/v1" };
  const key = edit.key?.trim();
  if (key === "" && found.source !== "endpoint") return { _tag: "Invalid", reason: "Paste a key" };
  // A stored key is for the address it was given for: sending it to another would hand it over to whoever answers there.
  if (key === undefined && baseUrl !== found.baseUrl && found.source === "endpoint")
    return { _tag: "Invalid", reason: "Paste the key again: the one kept here was for the old address" };
  if (key !== undefined) await vault.put(secretName(id), key);
  const label = edit.label?.trim() || found.label;
  const draft: ModelConnection = { ...found, label, baseUrl };
  const tested = await test(dependencies, draft);
  saveConnection(sql, tested, clock.now());
  return { _tag: "Added", connection: tested };
}

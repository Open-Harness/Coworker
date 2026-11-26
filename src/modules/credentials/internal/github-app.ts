import type { Problem, Values } from "../types.ts";

/** The manifest for this staging address. GitHub sends the browser back to `returnTo`, with a code in the address. */
export function manifestFor(manifest: string, stagingUrl: string, returnTo: string): string {
  const filled = JSON.parse(manifest.replaceAll("https://REPLACE_AT_DEPLOY", stagingUrl)) as Record<string, unknown>;
  return JSON.stringify({ ...filled, redirect_url: returnTo });
}

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> => typeof value === "object" && value !== null;

/** What GitHub answers when the App is made, as the settings it fills. */
export function settingsOf(conversion: unknown, pkcs8: (pem: string) => string): Values | Problem {
  const answer = isRecord(conversion) ? conversion : {};
  const text = (key: string): string => {
    const value = answer[key];
    return typeof value === "number" ? String(value) : typeof value === "string" ? value : "";
  };
  const values: Values = {
    GITHUB_APP_ID: text("id"),
    GITHUB_APP_SLUG: text("slug"),
    LIVE_APP_SLUG: text("slug"),
    GITHUB_APP_CLIENT_ID: text("client_id"),
    GITHUB_APP_CLIENT_SECRET: text("client_secret"),
    GITHUB_WEBHOOK_SECRET: text("webhook_secret"),
    GITHUB_APP_PRIVATE_KEY: text("pem") === "" ? "" : pkcs8(text("pem")),
  };
  const missing = Object.keys(values).filter((name) => values[name] === "");
  return missing.length === 0 ? values : { _tag: "Problem", reason: `GitHub's answer had no value for ${missing.join(", ")}` };
}

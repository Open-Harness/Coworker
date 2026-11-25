import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";

/** Every setting of the server. README.md says what each one does. */
export const SETTINGS = [
  "ANTHROPIC_API_KEY",
  "OPENAI_API_KEY",
  "PI_EXP_PROXY_URL",
  "PI_EXP_PROXY_MODELS",
  "PI_EXP_PROXY_KEY",
  "PI_EXP_DEFAULT_MODEL",
  "PI_EXP_ADMINS",
  "PI_EXP_FAKE_MODEL",
  "BETTER_AUTH_SECRET",
  "GITHUB_APP_ID",
  "GITHUB_APP_SLUG",
  "GITHUB_APP_PRIVATE_KEY",
  "GITHUB_WEBHOOK_SECRET",
] as const;
export const SECRETS = [
  "ANTHROPIC_API_KEY",
  "OPENAI_API_KEY",
  "PI_EXP_PROXY_KEY",
  "BETTER_AUTH_SECRET",
  "GITHUB_APP_PRIVATE_KEY",
  "GITHUB_WEBHOOK_SECRET",
] as const;

/** From `.env`, then `.env.local`, then the shell; the later one wins. Unset and empty settings are left out. */
export function readSettings(): Readonly<Record<string, string>> {
  const files = [".env", ".env.local"].filter((file) => existsSync(file)).map((file) => parseEnv(readFileSync(file, "utf8")));
  const all: Record<string, string | undefined> = Object.assign({}, ...files, process.env);
  return Object.fromEntries(SETTINGS.flatMap((name) => (all[name] ? [[name, all[name]]] : [])));
}

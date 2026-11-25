import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { live } from "../modules/live/service.ts";

/**
 * The live tier's settings: the shell's first, then `.dev.vars` (names in `.dev.vars.example`). Unset and empty are
 * left out. Read by `vitest.live.config.ts` and by `score.ts --live`, so both see the same ones.
 */
export function liveSettings(): Record<string, string> {
  const file = existsSync(".dev.vars") ? parseEnv(readFileSync(".dev.vars", "utf8")) : {};
  return Object.fromEntries(
    live.settings.flatMap(({ name }) => {
      const value = process.env[name] ?? file[name] ?? "";
      return value === "" ? [] : [[name, value]];
    }),
  );
}

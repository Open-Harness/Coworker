import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

/** celld stops on any wrangler key it does not know, and Vite's generated config has dozens. Keep only these. */
const KEPT = ["name", "compatibility_date", "compatibility_flags", "durable_objects", "migrations"];
/** celld refuses a directory with the first; the rest is secret, private or only for wrangler. */
const LEFT_OUT = /^(\.assetsignore|\.dev\.vars.*|\.env.*|wrangler\.json|.*\.map)$/u;

/** Puts the build where celld can run it, without touching celld's own state there. */
export function stage(directory: string, vars: Readonly<Record<string, string>>): void {
  if (!existsSync("dist/server/wrangler.json")) throw new Error("Not built; run pnpm build first");
  const built = JSON.parse(readFileSync("dist/server/wrangler.json", "utf8")) as Record<string, unknown>;
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  for (const part of ["server", "client"]) {
    rmSync(join(directory, part), { recursive: true, force: true });
    cpSync(join("dist", part), join(directory, part), { recursive: true, filter: (source) => !LEFT_OUT.test(basename(source)) });
  }
  const config = {
    ...Object.fromEntries(KEPT.filter((key) => built[key] !== undefined).map((key) => [key, built[key]])),
    main: `server/${String(built["main"])}`,
    assets: { directory: "client" },
    vars,
  };
  // It holds the keys: celld has no secret store.
  const file = join(directory, "wrangler.json");
  rmSync(file, { force: true });
  writeFileSync(file, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
}

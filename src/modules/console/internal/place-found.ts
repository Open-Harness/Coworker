import type { Found } from "~/modules/views-manager/types.ts";
import type { ConsoleDeps } from "../types.ts";

/* What reading a place finds: what the repo is, how it is installed and tested. Only ever read, and only what is named here. */

const LOCKS: readonly (readonly [string, string, string])[] = [
  ["pnpm-lock.yaml", "pnpm install --frozen-lockfile", "pnpm"],
  ["yarn.lock", "yarn install --frozen-lockfile", "yarn"],
  ["package-lock.json", "npm ci", "npm"],
  ["bun.lock", "bun install --frozen-lockfile", "bun"],
];

type Read = Awaited<ReturnType<ConsoleDeps["outside"]["read"]>>;
const textOf = (read: Read): string | undefined => (read._tag === "File" ? read.text : undefined);

/** The `test` script of a package.json, when it has one. */
function scriptOf(packageJson: string | undefined): string | undefined {
  try {
    const parsed: unknown = JSON.parse(packageJson ?? "");
    if (typeof parsed !== "object" || parsed === null || !("scripts" in parsed)) return undefined;
    const { scripts } = parsed;
    return typeof scripts === "object" && scripts !== null && "test" in scripts && typeof scripts.test === "string"
      ? scripts.test
      : undefined;
  } catch {
    return undefined;
  }
}

export async function foundAt(c: ConsoleDeps, place: string): Promise<Found> {
  const started = c.clock.now();
  const names = ["package.json", ...LOCKS.map(([name]) => name), "pyproject.toml", "Cargo.toml", "go.mod", "Makefile", "test.sh"];
  const there = new Map<string, string>();
  for (const name of names) {
    const text = textOf(await c.outside.read(place, name));
    if (text !== undefined) there.set(name, text);
  }
  const lock = LOCKS.find(([name]) => there.has(name));
  const cannot: string[] = [];
  const hasPackage = there.has("package.json");
  const install =
    lock?.[1] ??
    (hasPackage
      ? "npm install"
      : there.has("pyproject.toml")
        ? "pip install -e ."
        : there.has("Cargo.toml")
          ? "cargo fetch"
          : there.has("go.mod")
            ? "go mod download"
            : "true");
  const script = scriptOf(there.get("package.json"));
  const manager = lock?.[2] ?? "npm";
  const test =
    hasPackage && script !== undefined
      ? `${manager} test`
      : there.has("pyproject.toml")
        ? "pytest"
        : there.has("Cargo.toml")
          ? "cargo test"
          : there.has("go.mod")
            ? "go test ./..."
            : there.has("Makefile") && /^test:/mu.test(there.get("Makefile") ?? "")
              ? "make test"
              : there.has("test.sh")
                ? "sh test.sh"
                : "";
  if (test === "") cannot.push("It found no way the repo is tested.");
  const language = hasPackage
    ? "JavaScript"
    : there.has("pyproject.toml")
      ? "Python"
      : there.has("Cargo.toml")
        ? "Rust"
        : there.has("go.mod")
          ? "Go"
          : "Unknown";
  const read = c.clock.now() - started;
  return {
    repo: { name: place, language, open: 0, merged90: 0 },
    install,
    test,
    took: { read, ran: 0 },
    ran: { passed: 0, skipped: 0, failed: 0 },
    cannot,
    notSure: ["The tests were read and not run: running them once in a copy is not done yet."],
  };
}

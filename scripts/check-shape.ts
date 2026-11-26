import { existsSync, globSync, readdirSync, readFileSync } from "node:fs";

/** The rules of ~/AGENTS.md that a program can check. Prints every break and exits 1. */
const MAX_LINES = 250;
const SLOTS = ["README.md", "types.ts", "service.ts", "internal"];
const GENERATED = /routeTree\.gen\.ts$|\.sql$/u;
/** The only files that may read the environment, print or exit. `_app.tsx` is the browser's composition root. */
/** `src/world.ts` is part of the composition root: where the fake or the real outside thing is chosen. */
const ROOTS = new Set(["src/main.ts", "src/world.ts", ...globSync("src/bin/*.ts")]);
const BROWSER_ROOTS = new Set(["src/routes/_app.tsx", "src/routes/_team.tsx", "src/routes/__root.tsx"]);

const problems: string[] = [];
const complain = (file: string, message: string): void => void problems.push(`${file}: ${message}`);

for (const name of readdirSync("src/modules")) {
  const path = `src/modules/${name}`;
  for (const slot of SLOTS) if (!existsSync(`${path}/${slot}`)) complain(path, `no ${slot}`);
  if (!existsSync(`${path}/${name}.test.ts`) && !existsSync(`${path}/${name}.test.tsx`)) complain(path, `no ${name}.test.ts`);
}

const moduleOf = (file: string): string | undefined => /^src\/modules\/([^/]+)\//u.exec(file)?.[1];

function checkImports(file: string, text: string): void {
  const own = moduleOf(file);
  const isTest = /\.test\.tsx?$/u.test(file);
  for (const [, target = ""] of text.matchAll(/(?:from|import)\s+"([^"]+)"/gu)) {
    const other = /^~\/modules\/([^/]+)\//u.exec(target)?.[1];
    if (other !== undefined && target.includes("/internal/")) complain(file, `imports another module's internal: ${target}`);
    if (other !== undefined && other === own) complain(file, `names its own module by alias: ${target}`);
    if (other !== undefined && !/\/(types|service|testing)\.ts$/u.test(target)) complain(file, `imports past an interface: ${target}`);
    // Fakes are for tests and the composition roots, which pick the fake world.
    if (other !== undefined && target.endsWith("/testing.ts") && !isTest && !ROOTS.has(file))
      complain(file, `uses a fake outside a test: ${target}`);
    if (own !== undefined && target.startsWith("../../") && !(isTest && target.includes("/test/"))) {
      complain(file, `crosses modules by distance: ${target}`);
    }
    if (file.endsWith("/types.ts") && target.startsWith("./internal")) complain(file, "types.ts imports its internal");
    if (own !== undefined && isTest && target.startsWith("./internal")) complain(file, "tests past the interface");
  }
}

const FORBIDDEN: readonly (readonly [RegExp, string])[] = [
  [/\bconsole\.\w+\(/u, "prints"],
  [/\bprocess\.(env|exit|argv|std\w+)\b/u, "reads the process"],
  [/\bimport\.meta\.env\b/u, "reads the environment"],
  [/\b(window|localStorage|sessionStorage|navigator|globalThis)\./u, "reaches for a browser global"],
  [
    /\bdocument\.(body|cookie|createElement|getElement\w*|querySelector\w*|addEventListener)\b|\blocation\.(href|assign|reload)\b/u,
    "reaches for a browser global",
  ],
  [/:\s*any\b|\bas any\b|<any>/u, "uses any"],
];

const LAYERS: readonly (readonly [RegExp, readonly string[]])[] = [
  // Pages never see the server, and the server never sees pages.
  [
    /^src\/modules\/(ui|app|admin|api|connection|directory-client|manager-client|team-app|team-core|team-join|team-start|team-shell|team-settings|team-build|team-home)\//u,
    [
      "dashboards",
      "manager",
      "chat-host",
      "directory",
      "http",
      "agent",
      "agent-engine",
      "chats",
      "documents",
      "history",
      "schedule",
      "web",
    ],
  ],
  [
    /^src\/modules\/(manager|chat-host|directory|http|agent|chats|documents|history|schedule|web|transcript|protocol|agent-config|agents|agent-engine|auth|workspaces|workspace|vault|models|search|triggers|email|github|sandboxes|billing|chat-sdk|dashboards|boxes|connectors|threads|tree|coworker|mcp|playbook|templates|intake|work|reach)\//u,
    [
      "ui",
      "app",
      "admin",
      "connection",
      "directory-client",
      "manager-client",
      "team-app",
      "team-core",
      "team-join",
      "team-start",
      "team-shell",
      "team-settings",
      "team-build",
      "team-home",
    ],
  ],
  // The user view does not know the admin view.
  [/^src\/modules\/app\//u, ["admin"]],
  [
    /^src\/modules\/ui\//u,
    [
      "app",
      "admin",
      "connection",
      "directory-client",
      "manager-client",
      "team-app",
      "team-core",
      "team-join",
      "team-start",
      "team-shell",
      "team-settings",
      "team-build",
      "team-home",
    ],
  ],
];

for (const file of globSync("src/**/*.{ts,tsx}")) {
  if (GENERATED.test(file)) continue;
  const text = readFileSync(file, "utf8");
  const lines = text.split("\n").length;
  if (lines > MAX_LINES) complain(file, `${lines} lines; at most ${MAX_LINES}`);
  checkImports(file, text);
  const isRoot = ROOTS.has(file);
  const isTest = /\.test\.tsx?$/u.test(file);
  const code = text.replace(/\/\*[\s\S]*?\*\//gu, "").replace(/(^|\s)\/\/.*$/gmu, "");
  for (const [pattern, what] of FORBIDDEN) {
    const inBrowserRoot = BROWSER_ROOTS.has(file) && what !== "prints" && what !== "uses any";
    if (!isRoot && !inBrowserRoot && !isTest && pattern.test(code)) complain(file, what);
  }
  for (const [layer, hidden] of LAYERS) {
    if (!layer.test(file) || isTest) continue;
    for (const [, other = ""] of text.matchAll(/"~\/modules\/([^/"]+)\//gu)) {
      if (hidden.includes(other)) complain(file, `may not see the ${other} module`);
    }
  }
}

for (const problem of problems) console.error(problem);
console.log(problems.length === 0 ? "The shape is right" : `${problems.length} problems`);
process.exit(problems.length === 0 ? 0 : 1);

import { execFileSync } from "node:child_process";
import { globSync, readFileSync } from "node:fs";

/** Every pixel comes from Astryx: no raw elements, no own styles, no other component library. Prints every break and exits 1. */
const problems: string[] = [];
const complain = (file: string, line: number, message: string): void => void problems.push(`${file}:${line}: ${message}`);

/** The document itself is not Astryx's to draw. */
const DOCUMENT = "src/routes/__root.tsx";
const DOCUMENT_ELEMENTS = new Set(["html", "head", "body"]);
/** Works around one Astryx sizing bug; the file says which. `states.tsx` dims what was read while the connection is lost. */
const STYLED = new Set(["src/modules/ui/internal/NavGroup.tsx", "src/modules/page/internal/states.tsx"]);
/**
 * A screen adapts an Astryx template (D5): its first line says which, `// astryx-template: <name>`, and the template's own styling
 * and the brand marks it draws (svg) are allowed in that file. Only where screens are: no module may.
 */
const SCREENS = /^src\/(screens\/|door\/|juno\/|shell\.tsx$)/u;
const TEMPLATE = /^\/\/ astryx-template: [a-z][a-z0-9-]*$/u;
const BRAND_MARKS = new Set(["svg", "path"]);
/** The one file that draws charts. Astryx has no chart component, so this wraps recharts, which Astryx's own templates use. */
const CHARTS = "src/modules/ui/internal/Chart.tsx";
const ALLOWED_IMPORTS =
  /^(\.|~\/|react$|@astryxdesign\/|@heroicons\/react\/24\/outline$|@tanstack\/(react-router|react-start|react-store|store)|.*\.css\?url$)/u;

for (const file of globSync("src/**/*.tsx")) {
  if (file.endsWith(".test.tsx")) continue;
  const text = readFileSync(file, "utf8");
  const isTemplate = SCREENS.test(file) && TEMPLATE.test(text.split("\n")[0] ?? "");
  text.split("\n").forEach((line, index) => {
    const at = index + 1;
    for (const [, tag = ""] of line.matchAll(/<([a-z][\w-]*)(?=[\s/>])(?![^<]*=>)/gu)) {
      // Type arguments such as `useState<string>` follow a name; an element does not.
      const before = line.slice(0, line.indexOf(`<${tag}`));
      if (/[\w$]$/u.test(before)) continue;
      if (isTemplate && BRAND_MARKS.has(tag)) continue;
      if (file !== DOCUMENT || !DOCUMENT_ELEMENTS.has(tag)) complain(file, at, `draws <${tag}> instead of an Astryx component`);
    }
    if (!isTemplate && /\b(className|xstyle|dangerouslySetInnerHTML)=/u.test(line) && !/xstyle=\{rtlStyles\.mirror\}/u.test(line)) {
      complain(file, at, "styles a component itself");
    }
    if (/\bstyle=/u.test(line) && !STYLED.has(file) && !isTemplate) complain(file, at, "styles a component itself");
    const source = /from "([^"]+)"/u.exec(line)?.[1];
    const isChartLibrary = source === "recharts" && file === CHARTS;
    if (source !== undefined && !isChartLibrary && !ALLOWED_IMPORTS.test(source)) complain(file, at, `imports ${source}`);
  });
}

for (const file of globSync("src/**/*.css")) {
  readFileSync(file, "utf8")
    .split("\n")
    .forEach((line, index) => {
      if (line.trim() !== "" && !line.startsWith('@import "@astryxdesign/')) complain(file, index + 1, "has its own CSS");
    });
}

const manifest = JSON.parse(readFileSync("package.json", "utf8")) as Record<string, Record<string, string>>;
for (const name of Object.keys({ ...manifest["dependencies"], ...manifest["devDependencies"] })) {
  if (/tailwind|styled-components|emotion|shadcn|radix|@mui|chakra/u.test(name)) complain("package.json", 1, `depends on ${name}`);
}

/** Astryx's own check of the finished build and the installed packages. A warning counts. */
function doctor(): void {
  if (globSync("dist/client/assets/*.css").length === 0) return complain("dist", 1, "not built; run pnpm build first");
  const output = execFileSync("node_modules/.bin/astryx", ["doctor", "--built", "dist/client", "--json"], { encoding: "utf8" });
  const report = JSON.parse(output.slice(output.indexOf("{"))) as {
    data?: { checks?: { status?: string; id?: string; message?: string }[] };
  };
  const checks = report.data?.checks ?? [];
  if (checks.length === 0) complain("dist", 1, "astryx doctor reported nothing");
  for (const { status, id = "", message = "" } of checks) {
    // AGENTS.md is ours, and has no copy of Astryx's own page.
    if (status !== "pass" && status !== "info" && id !== "agent-docs")
      complain("dist/client", 1, `astryx doctor: ${status} ${id} ${message}`);
  }
}
doctor();

for (const problem of problems) console.error(problem);
console.log(problems.length === 0 ? "Only Astryx" : `${problems.length} problems`);
process.exit(problems.length === 0 ? 0 : 1);

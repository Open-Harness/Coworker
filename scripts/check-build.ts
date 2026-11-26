import { globSync, readFileSync, rmSync, statSync } from "node:fs";
import { readSettings, SECRETS } from "./settings.ts";

/** Runs after every build. Vite copies the local settings into the build; nothing secret may stay there. */
rmSync("dist/server/.dev.vars", { force: true });

const settings = readSettings();
const secrets = SECRETS.flatMap((name) => (settings[name] === undefined ? [] : [{ name, value: settings[name] }]));
const problems: string[] = [];
for (const file of globSync("dist/{client,server}/**/{*,.*}")) {
  if (!statSync(file).isFile()) continue;
  if (/(^|\/)\.(dev\.vars|env)/u.test(file)) problems.push(`${file}: settings in the build`);
  const text = readFileSync(file, "utf8");
  for (const { name, value } of secrets) if (text.includes(value)) problems.push(`${file}: contains ${name}`);
}
for (const problem of problems) console.error(problem);
console.log(problems.length === 0 ? "No secrets in the build" : `${problems.length} problems`);
process.exit(problems.length === 0 ? 0 : 1);

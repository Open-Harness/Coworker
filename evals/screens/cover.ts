/*
 * node evals/screens/cover.ts <screen>...   What a drawing says that no fixture has. What is left should be fixed words of the
 * screen; a number, a name or a sentence of somebody's that is left has no place in the views, or no fixture.
 */
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { READS, WRITES, OTHERS } from "./fixtures/index.ts";
import { main } from "./kit.ts";
import { said } from "./like.ts";
import { SCREENS } from "./screens.ts";

const root = fileURLToPath(new URL("../..", import.meta.url));
process.env["PORT"] ??= "5331";
const { createServer } = (await import(createRequire(`${root}package.json`).resolve("vite").replace(/index\.cjs$/u, "dist/node/index.js"))) as typeof import("vite");
const server = await createServer({ configFile: `${root}design/vite.config.mjs`, logLevel: "error" });
await server.listen();
const browser = await chromium.launch();
const all = JSON.stringify([READS, WRITES, OTHERS]).toLowerCase();
const wanted = process.argv.slice(2);
for (const { id } of SCREENS.filter((one) => wanted.length === 0 || wanted.includes(one.id))) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`http://localhost:${server.config.server.port}/?mode=light#${id}`);
  await page.waitForTimeout(2500);
  const lines = said(await (await main(page, { ...(id === "palette" ? { then: "mod+k" as const } : {}) })).ariaSnapshot());
  const left = lines.filter((line) => {
    const words = (line.replace(/^\w+ ?/u, "").toLowerCase().match(/[\p{L}\d.#@’'-]{2,}/gu) ?? []).filter((word) => word.length > 2 || /\d/u.test(word));
    return words.length > 0 && words.filter((word) => all.includes(word)).length / words.length < 0.75;
  });
  console.log(`\n== ${id}: ${lines.length - left.length} of ${lines.length}\n${[...new Set(left)].map((line) => `   ${line.slice(0, 160)}`).join("\n")}`);
  await page.close();
}
await browser.close();
await server.close();
process.exit(0);

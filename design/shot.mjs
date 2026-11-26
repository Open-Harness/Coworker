/* node design/shot.mjs <out folder> <hash>...   Writes <hash>.png (1440), -phone.png (390), -dark.png. PORT picks the port. Says what went wrong on the page. */
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const here = dirname(fileURLToPath(import.meta.url));
const { chromium } = createRequire(`${here}/../package.json`)("@playwright/test");
const [out = "design/shots", ...hashes] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const server = await createServer({ configFile: `${here}/vite.config.mjs`, logLevel: "error" });
await server.listen();
const port = server.config.server.port;
const browser = await chromium.launch();
const VIEWS = [["", 1440, 900, "light"], ["-phone", 390, 844, "light"], ["-dark", 1440, 900, "dark"]];
for (const hash of hashes)
  for (const [suffix, width, height, mode] of VIEWS) {
    const page = await browser.newPage({ viewport: { width, height } });
    const wrong = [];
    page.on("pageerror", (e) => wrong.push(e.message.slice(0, 200)));
    page.on("console", (m) => m.type() === "error" && !/styleq/.test(m.text()) && wrong.push(`console: ${m.text().slice(0, 160)}`));
    await page.goto(`http://localhost:${port}/?mode=${mode}#${hash}`);
    await page.waitForSelector("#root *");
    await page.waitForTimeout(2200);
    const wide = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    await page.screenshot({ path: resolve(out, `${hash}${suffix}.png`) });
    console.log(hash + suffix, wrong.length ? wrong.slice(0, 2) : "ok", wide ? "SCROLLS SIDEWAYS" : "");
    await page.close();
  }
await browser.close();
await server.close();
process.exit(0);

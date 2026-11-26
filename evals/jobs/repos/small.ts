import { AGENTS, PACKAGE, type Job } from "../job.ts";

/* Small faults, each in one place. */

export const DISCOUNT: Job = {
  id: "a-sum-that-drifts",
  files: {
    "package.json": PACKAGE,
    "AGENTS.md": AGENTS,
    "src/cart.js": `/** Totals are in cents everywhere. */
export const lineTotal = (line) => line.cents * line.count;

export function total(lines, percentOff = 0) {
  const sum = lines.reduce((all, line) => all + lineTotal(line), 0);
  return sum - sum * (percentOff / 100);
}

export const shown = (cents) => \`$\${(cents / 100).toFixed(2)}\`;
`,
    "src/receipt.js": `import { lineTotal, shown, total } from "./cart.js";

export function receipt(lines, percentOff) {
  const rows = lines.map((line) => \`\${line.name} x\${line.count}  \${shown(lineTotal(line))}\`);
  return [...rows, \`Total  \${shown(total(lines, percentOff))}\`].join("\\n");
}
`,
    "test/cart.test.js": `import { test } from "node:test";
import assert from "node:assert";
import { total } from "../src/cart.js";

test("adds up", () => assert.equal(total([{ cents: 250, count: 2 }]), 500));
test("takes a tenth off", () => assert.equal(total([{ cents: 1000, count: 1 }], 10), 900));
`,
  },
  issue: {
    title: "The charge and the receipt differ by a cent",
    body: "A customer bought one thing for $1.99 with 15% off. The payment provider refused the amount 169.15 because it must be a whole number of cents. Round half up, please: 169.5 is 170.",
  },
  hidden: {
    "hidden.test.js": `import { test } from "node:test";
import assert from "node:assert";
import { total } from "./src/cart.js";
import { receipt } from "./src/receipt.js";
test("whole cents", () => assert.equal(total([{ cents: 199, count: 1 }], 15), 169));
test("half up", () => assert.equal(total([{ cents: 113, count: 3 }], 50), 170));
test("nothing off", () => assert.equal(total([{ cents: 1, count: 3 }]), 3));
test("receipt", () => assert.match(receipt([{ name: "Tea", cents: 199, count: 1 }], 15), /Total {2}\\$1\\.69$/));
`,
  },
  test: "node --test hidden.test.js && node --test test/*.test.js",
};

export const PAGES: Job = {
  id: "the-last-page",
  files: {
    "package.json": PACKAGE,
    "AGENTS.md": AGENTS,
    "src/pages.js": `/** One page of a list, and how many pages there are. Pages count from 1. */
export function page(all, number, size = 20) {
  const pages = Math.floor(all.length / size) + 1;
  const from = (number - 1) * size;
  return { rows: all.slice(from, from + size - 1), pages };
}
`,
    "test/pages.test.js": `import { test } from "node:test";
import assert from "node:assert";
import { page } from "../src/pages.js";

test("a short list is one page", () => assert.equal(page([1, 2, 3], 1).pages, 1));
test("the first row is first", () => assert.equal(page([7, 8, 9], 1).rows[0], 7));
`,
  },
  issue: { title: "Rows are missing from lists", body: "With 40 customers I see 19 on the first page and 19 on the second, and there is a third page with nothing on it." },
  hidden: {
    "hidden.test.js": `import { test } from "node:test";
import assert from "node:assert";
import { page } from "./src/pages.js";
const all = (n) => Array.from({ length: n }, (_, i) => i);
test("all rows once", () => assert.deepEqual([...page(all(40), 1).rows, ...page(all(40), 2).rows], all(40)));
test("no page of nothing", () => assert.equal(page(all(40), 1).pages, 2));
test("one more", () => assert.equal(page(all(41), 3).rows.length, 1));
test("an empty list is one empty page", () => assert.deepEqual(page([], 1), { rows: [], pages: 1 }));
`,
  },
  test: "node --test hidden.test.js && node --test test/*.test.js",
};

export const LINKS: Job = {
  id: "a-name-in-a-link",
  files: {
    "package.json": PACKAGE,
    "AGENTS.md": AGENTS,
    "src/html.js": `export const link = (text, url) => \`<a href="\${url}">\${text}</a>\`;

export const list = (people) => \`<ul>\${people.map((p) => \`<li>\${link(p.name, "/people?name=" + p.name)}</li>\`).join("")}</ul>\`;
`,
    "test/html.test.js": `import { test } from "node:test";
import assert from "node:assert";
import { list } from "../src/html.js";

test("links to each", () => assert.equal(list([{ name: "Ama" }]), '<ul><li><a href="/people?name=Ama">Ama</a></li></ul>'));
`,
  },
  issue: { title: "Tom & Jerry's page does not open", body: "The link of the person called `Tom & Jerry` goes to the page of `Tom `. Somebody also managed to be called `<b>Bo</b>` and is shown in bold." },
  hidden: {
    "hidden.test.js": `import { test } from "node:test";
import assert from "node:assert";
import { list } from "./src/html.js";
const of = (name) => list([{ name }]);
test("the address", () => assert.match(of("Tom & Jerry"), /href="\\/people\\?name=Tom(?:%20|\\+)%26(?:%20|\\+)Jerry"/));
test("the text", () => assert.match(of("Tom & Jerry"), />Tom &amp; Jerry</));
test("no markup", () => assert.doesNotMatch(of("<b>Bo</b>"), /<b>/));
test("cannot leave the attribute", () => assert.doesNotMatch(of('" onclick="x'), /" onclick="/));
test("plain as before", () => assert.equal(of("Ama"), '<ul><li><a href="/people?name=Ama">Ama</a></li></ul>'));
`,
  },
  test: "node --test hidden.test.js && node --test test/*.test.js",
};

export const ORDER: Job = {
  id: "answers-in-the-wrong-order",
  files: {
    "package.json": PACKAGE,
    "AGENTS.md": AGENTS,
    "src/search.js": `/** A search box: calls \`show\` with what \`ask\` answers for what was typed last. */
export function searchBox(ask, show) {
  return async function typed(words) {
    const found = await ask(words);
    show(found);
  };
}
`,
    "test/search.test.js": `import { test } from "node:test";
import assert from "node:assert";
import { searchBox } from "../src/search.js";

test("shows what was found", async () => {
  const seen = [];
  await searchBox(async (w) => w.toUpperCase(), (x) => seen.push(x))("a");
  assert.deepEqual(seen, ["A"]);
});
`,
  },
  issue: { title: "Search shows results for what I typed before", body: "When I type quickly, the list sometimes ends up with results for half a word. If a search fails while I have already typed something else, nobody needs to hear of it; if the last one fails it should still throw." },
  hidden: {
    "hidden.test.js": `import { test } from "node:test";
import assert from "node:assert";
import { searchBox } from "./src/search.js";
const later = () => { let go, no; const p = new Promise((a, b) => ((go = a), (no = b))); return { p, go, no }; };
test("the last typed wins", async () => {
  const held = { a: later(), ab: later() }; const seen = [];
  const typed = searchBox((w) => held[w].p, (x) => seen.push(x));
  const one = typed("a"), two = typed("ab");
  held.ab.go("AB"); await two; held.a.go("A"); await one;
  assert.deepEqual(seen, ["AB"]);
});
test("an old failure is nobody's", async () => {
  const held = { a: later(), ab: later() }; const seen = [];
  const typed = searchBox((w) => held[w].p, (x) => seen.push(x));
  const one = typed("a"), two = typed("ab");
  held.a.no(new Error("x")); await one; held.ab.go("AB"); await two;
  assert.deepEqual(seen, ["AB"]);
});
test("the last failure throws", async () => { await assert.rejects(searchBox(async () => { throw new Error("x"); }, () => {})("a")); });
test("two boxes do not mix", async () => {
  const seen = []; const ask = async (w) => w;
  const a = searchBox(ask, (x) => seen.push(x)), b = searchBox(ask, (x) => seen.push(x));
  await Promise.all([a("1"), b("2")]); assert.deepEqual(seen.sort(), ["1", "2"]);
});
`,
  },
  test: "node --test hidden.test.js && node --test test/*.test.js",
};

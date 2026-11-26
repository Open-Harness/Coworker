import { AGENTS, PACKAGE, type Job } from "../job.ts";

/* Faults that touch more than one file, and one thing to add. */

const LIMIT: Job = {
  id: "a-limit-that-forgets",
  files: {
    "package.json": PACKAGE,
    "AGENTS.md": AGENTS,
    "src/limit.js": `/** At most \`max\` calls in any \`windowMs\`, per key. */
export function limiter(max, windowMs, now = Date.now) {
  const seen = new Map();
  return {
    allow(key) {
      const at = now();
      const entry = seen.get(key) ?? { count: 0, since: at };
      if (at - entry.since > windowMs) {
        entry.count = 0;
        entry.since = at;
      }
      entry.count++;
      seen.set(key, entry);
      return entry.count <= max;
    },
    size: () => seen.size,
  };
}
`,
    "src/server.js": `import { limiter } from "./limit.js";

export function server(now) {
  const limit = limiter(3, 1000, now);
  return (request) => (limit.allow(request.ip) ? { status: 200 } : { status: 429 });
}
`,
    "test/limit.test.js": `import { test } from "node:test";
import assert from "node:assert";
import { limiter } from "../src/limit.js";

test("the fourth is refused", () => {
  const l = limiter(3, 1000, () => 0);
  assert.deepEqual([1, 2, 3, 4].map(() => l.allow("a")), [true, true, true, false]);
});
test("keys are apart", () => {
  const l = limiter(1, 1000, () => 0);
  l.allow("a");
  assert.equal(l.allow("b"), true);
});
`,
  },
  issue: {
    title: "Twice the limit gets through, and the memory grows",
    body: "The comment says at most 3 in any second. I can get 6 through in 200 ms by waiting for the end of the second. A refused call must not count. And the map has an entry for every address that ever called: one that was quiet for a whole window should be forgotten. `size()` is what we watch.",
  },
  hidden: {
    "hidden.test.js": `import { test } from "node:test";
import assert from "node:assert";
import { limiter } from "./src/limit.js";
import { server } from "./src/server.js";
test("any window, not each", () => {
  let t = 0; const l = limiter(3, 1000, () => t);
  const at = (ms) => { t = ms; return l.allow("a"); };
  assert.deepEqual([at(900), at(950), at(990), at(1010), at(1100), at(1899)], [true, true, true, false, false, false]);
  assert.equal(at(1901), true);
});
test("refused does not count", () => {
  let t = 0; const l = limiter(1, 1000, () => t);
  l.allow("a"); for (t = 100; t < 1000; t += 100) l.allow("a");
  t = 1001; assert.equal(l.allow("a"), true);
});
test("forgets the quiet", () => {
  let t = 0; const l = limiter(3, 1000, () => t);
  for (let i = 0; i < 500; i++) l.allow("k" + i);
  t = 5000; l.allow("new");
  assert.ok(l.size() <= 2, "size " + l.size());
});
test("server", () => { const s = server(() => 0); assert.deepEqual([1, 2, 3, 4].map(() => s({ ip: "x" }).status), [200, 200, 200, 429]); });
`,
  },
  test: "node --test hidden.test.js && node --test test/*.test.js",
};

const CSV: Job = {
  id: "a-comma-in-a-cell",
  files: {
    "package.json": PACKAGE,
    "AGENTS.md": AGENTS,
    "src/csv.js": `export const write = (rows) => rows.map((row) => row.join(",")).join("\\n");
export const read = (text) => text.split("\\n").map((line) => line.split(","));
`,
    "src/export.js": `import { write } from "./csv.js";

export const HEAD = ["name", "note", "paid"];
export const exported = (customers) => write([HEAD, ...customers.map((c) => [c.name, c.note, c.paid])]);
`,
    "src/import.js": `import { HEAD } from "./export.js";
import { read } from "./csv.js";

export function imported(text) {
  const [head, ...rows] = read(text);
  if (head.join() !== HEAD.join()) throw new Error("Not our file");
  return rows.map(([name, note, paid]) => ({ name, note, paid: paid === "true" }));
}
`,
    "test/csv.test.js": `import { test } from "node:test";
import assert from "node:assert";
import { exported } from "../src/export.js";
import { imported } from "../src/import.js";

test("there and back", () => {
  const all = [{ name: "Ama", note: "new", paid: true }];
  assert.deepEqual(imported(exported(all)), all);
});
test("plain stays plain", () => assert.equal(exported([{ name: "Ama", note: "new", paid: true }]), "name,note,paid\\nAma,new,true"));
`,
  },
  issue: { title: "Import after export mixes up columns", body: "Our customer `Reyes, Pat` comes back with the note `Pat`. A note with a line break becomes two customers. Excel also saves our file with \\r\\n and then nothing is paid." },
  hidden: {
    "hidden.test.js": `import { test } from "node:test";
import assert from "node:assert";
import { exported } from "./src/export.js";
import { imported } from "./src/import.js";
const same = (all) => assert.deepEqual(imported(exported(all)), all);
test("a comma", () => same([{ name: "Reyes, Pat", note: "x", paid: true }]));
test("a quote", () => same([{ name: 'Bo "the" Larsen', note: '"', paid: false }]));
test("a line break", () => same([{ name: "Ama", note: "one\\ntwo", paid: true }, { name: "Bo", note: "", paid: false }]));
test("from Excel", () => assert.deepEqual(imported("name,note,paid\\r\\nAma,new,true\\r\\n"), [{ name: "Ama", note: "new", paid: true }]));
test("nothing", () => same([]));
`,
  },
  test: "node --test hidden.test.js && node --test test/*.test.js",
};

const DUE: Job = {
  id: "a-thing-to-add",
  files: {
    "package.json": PACKAGE,
    "AGENTS.md": `${AGENTS}Every function that callers use is named in README.md.\n`,
    "README.md": "# Tasks\n\n- `add(list, title)` answers a new list with one more task.\n- `done(list, title)` answers a new list with that one done.\n",
    "src/tasks.js": `/** Lists are never changed: each function answers a new one. */
export const add = (list, title) => [...list, { title, done: false }];
export const done = (list, title) => list.map((task) => (task.title === title ? { ...task, done: true } : task));
`,
    "test/tasks.test.js": `import { test } from "node:test";
import assert from "node:assert";
import { add, done } from "../src/tasks.js";

test("add", () => assert.deepEqual(add([], "Tea"), [{ title: "Tea", done: false }]));
test("done", () => assert.equal(done(add([], "Tea"), "Tea")[0].done, true));
`,
  },
  issue: {
    title: "Due dates",
    body: "`add(list, title, due)` should take an optional due date like `2026-11-25`. `overdue(list, today)` answers the tasks that are not done and whose date is before today, earliest first. Tasks without a date look exactly as they do now.",
  },
  hidden: {
    "hidden.test.js": `import { test } from "node:test";
import assert from "node:assert";
import { readFileSync } from "node:fs";
import { add, done, overdue } from "./src/tasks.js";
test("as before", () => assert.deepEqual(add([], "Tea"), [{ title: "Tea", done: false }]));
test("overdue", () => {
  let list = add(add(add(add([], "B", "2026-11-24"), "A", "2026-11-20"), "Today", "2026-11-25"), "None");
  list = add(list, "Finished", "2026-11-01"); list = done(list, "Finished");
  const before = JSON.stringify(list);
  assert.deepEqual(overdue(list, "2026-11-25").map((t) => t.title), ["A", "B"]);
  assert.equal(JSON.stringify(list), before);
});
test("documented", () => assert.match(readFileSync("README.md", "utf8"), /overdue/));
`,
  },
  test: "node --test hidden.test.js && node --test test/*.test.js",
};

const NOT_OURS: Job = {
  id: "not-more-than-asked",
  files: {
    "package.json": PACKAGE,
    "AGENTS.md": AGENTS,
    "src/greet.js": `// TODO: this whole file should be classes
var GREETINGS = { en: "Hello", da: "Hej", fr: "Bonjour" }
export function greet(name, lang) {
  return GREETINGS[lang] + ", " + name + "!"
}
`,
    "src/ugly.js": `// nobody likes this file
export function x(a){var b=a;return b}
`,
    "test/greet.test.js": `import { test } from "node:test";
import assert from "node:assert";
import { greet } from "../src/greet.js";

test("in Danish", () => assert.equal(greet("Bo", "da"), "Hej, Bo!"));
`,
  },
  issue: { title: "`undefined, Ama!`", body: "A language we do not have should be greeted in English." },
  hidden: {
    "hidden.test.js": `import { test } from "node:test";
import assert from "node:assert";
import { greet } from "./src/greet.js";
test("unknown", () => assert.equal(greet("Ama", "xx"), "Hello, Ama!"));
test("none", () => assert.equal(greet("Ama"), "Hello, Ama!"));
test("not from the prototype", () => assert.equal(greet("Ama", "constructor"), "Hello, Ama!"));
test("known", () => assert.equal(greet("Ama", "fr"), "Bonjour, Ama!"));
`,
  },
  test: "node --test hidden.test.js && node --test test/*.test.js",
  untouched: ["src/ugly.js", "package.json", "AGENTS.md"],
};

export const LARGER: readonly Job[] = [LIMIT, CSV, DUE, NOT_OURS];

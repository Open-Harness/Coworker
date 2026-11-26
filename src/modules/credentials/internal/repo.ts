import type { Problem, Run } from "../types.ts";

const FILES: readonly (readonly [string, string])[] = [
  ["package.json", '{ "scripts": { "test": "node --test" } }\n'],
  ["sum.test.mjs", 'import test from "node:test";\nimport assert from "node:assert";\n\ntest("adds", () => assert.equal(1 + 1, 2));\n'],
];

const failed = (what: string): Problem => ({ _tag: "Problem", reason: `GitHub did not ${what}` });

/** The private repo the sandbox test clones, with one passing test in it. What is there already is left alone. */
export async function ensureRepo(run: Run, repo: string): Promise<{ readonly _tag: "Ready"; readonly made: boolean } | Problem> {
  const there = (await run(["gh", "api", `repos/${repo}`, "--silent"])).code === 0;
  if (!there && (await run(["gh", "repo", "create", repo, "--private", "--add-readme"])).code !== 0) return failed(`make ${repo}`);
  for (const [path, text] of FILES) {
    if ((await run(["gh", "api", `repos/${repo}/contents/${path}`, "--silent"])).code === 0) continue;
    const body = JSON.stringify({ message: `Add ${path}`, content: Buffer.from(text).toString("base64") });
    const put = await run(["gh", "api", "--method", "PUT", `repos/${repo}/contents/${path}`, "--input", "-", "--silent"], body);
    if (put.code !== 0) return failed(`add ${path} to ${repo}`);
  }
  return { _tag: "Ready", made: !there };
}

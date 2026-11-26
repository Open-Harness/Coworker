import { describe, expect, it } from "vitest";
import { checkBundle } from "~/modules/boxes/service.ts";
import type { Bundle } from "~/modules/boxes/types.ts";

const rules = { branch: "coworker/fix-1", defaultBranch: "main", workflows: false, most: 1000 };
const bundle = (more: Partial<Bundle> = {}): Bundle => ({
  repo: "acme/web",
  branch: "coworker/fix-1",
  base: "a1b2c3",
  head: "d4e5f6",
  files: ["src/login.ts", "src/login.test.ts"],
  bytes: new Uint8Array(100),
  ...more,
});
const refused = (checked: ReturnType<typeof checkBundle>, names?: RegExp | string) => {
  expect(checked._tag).toBe("Refused");
  if (checked._tag !== "Refused") return;
  expect(checked.why.trim().length).toBeGreaterThan(3);
  expect(checked.why).not.toMatch(/\b(blocked|pending)\b/iu);
  if (typeof names === "string") expect(checked.why).toContain(names);
  else if (names) expect(checked.why).toMatch(names);
};

describe("boxes", () => {
  it("rules:boxes/an-ordinary-branch-of-its-own-leaves", () => {
    expect(checkBundle(bundle(), rules)).toEqual({ _tag: "Fine" });
    expect(checkBundle(bundle({ files: ["README.md"] }), { ...rules, workflows: true })).toEqual({ _tag: "Fine" });
    expect(
      checkBundle(bundle({ files: [".github/ISSUE_TEMPLATE/bug.md", "docs/workflows/ci.yml", ".github/workflowsx/a.yml"] }), rules),
    ).toEqual({
      _tag: "Fine",
    });
  });

  it("rules:boxes/only-its-own-branch", () => {
    for (const branch of ["coworker/fix-2", "coworker/fix-10", "coworker/fix-1/extra", "Coworker/fix-1", "coworker/fix-", "other", ""])
      refused(checkBundle(bundle({ branch }), rules), branch === "" ? undefined : branch);
    // The branch is the one in the rules, and the rules are not the bundle's.
    expect(checkBundle(bundle({ branch: "coworker/fix-7" }), { ...rules, branch: "coworker/fix-7" })).toEqual({ _tag: "Fine" });
    refused(checkBundle(bundle({ branch: "coworker/fix-1" }), { ...rules, branch: "coworker/fix-7" }));
  });

  it("rules:boxes/never-the-default-branch", () => {
    refused(checkBundle(bundle({ branch: "main" }), { ...rules, branch: "main" }), /main/u);
    refused(checkBundle(bundle({ branch: "main" }), { ...rules, branch: "main", workflows: true }), /main/u);
    refused(checkBundle(bundle({ branch: "develop" }), { ...rules, branch: "develop", defaultBranch: "develop" }), /develop/u);
    // Another default does not make this branch the default one.
    expect(checkBundle(bundle(), { ...rules, defaultBranch: "trunk" })).toEqual({ _tag: "Fine" });
    // It is not asked of the bundle's other parts: only the branch tells.
    refused(checkBundle(bundle({ branch: "main", files: [] }), { ...rules, branch: "main" }));
  });

  it("rules:boxes/no-workflow-files-unless-the-mandate-says-so", () => {
    for (const file of [
      ".github/workflows/ci.yml",
      ".github/workflows/release.yaml",
      ".github/workflows/deep/er/x.yml",
      "./.github/workflows/ci.yml",
      ".github//workflows/ci.yml",
    ]) {
      refused(checkBundle(bundle({ files: ["src/a.ts", file, "src/b.ts"] }), rules), /workflows/u);
      expect(checkBundle(bundle({ files: ["src/a.ts", file] }), { ...rules, workflows: true }), file).toEqual({ _tag: "Fine" });
    }
    // The file is named so that a person can see which.
    refused(checkBundle(bundle({ files: [".github/workflows/ci.yml"] }), rules), /\.github\/workflows\/ci\.yml/u);
    // Even when the branch and the rest are right, a branch that is wrong stays refused with workflows on.
    refused(checkBundle(bundle({ branch: "other", files: [".github/workflows/ci.yml"] }), { ...rules, workflows: true }));
  });

  it("rules:boxes/a-bundle-over-its-limit-is-refused", () => {
    // Under, and at the limit: files and bytes alike.
    const files = (n: number) => Array.from({ length: n }, (_, i) => `src/f${i}.ts`);
    const limit = { ...rules, most: 10 };
    expect(checkBundle(bundle({ files: files(10), bytes: new Uint8Array(10) }), limit)).toEqual({ _tag: "Fine" });
    expect(checkBundle(bundle({ files: files(3), bytes: new Uint8Array(3) }), limit)).toEqual({ _tag: "Fine" });
    // Over it, in files and in bytes alike.
    refused(checkBundle(bundle({ files: files(11), bytes: new Uint8Array(11) }), limit));
    refused(checkBundle(bundle({ files: files(500), bytes: new Uint8Array(5000) }), limit));
  });
});

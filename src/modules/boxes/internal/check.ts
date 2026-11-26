import type { Bundle, CheckBundle, Checked } from "../types.ts";

const fine: Checked = { _tag: "Fine" };

const refuse = (why: string): Checked => ({ _tag: "Refused", why });

/** The path a name stands for: no leading `./`, no doubled slash. */
export function normalPath(path: string): string {
  const parts = path.split("/").filter((part) => part !== "" && part !== ".");
  return parts.join("/");
}

const isWorkflow = (path: string): boolean => normalPath(path).startsWith(".github/workflows/");

function branchProblem(branch: string, rules: Parameters<CheckBundle>[1]): string | undefined {
  if (branch === rules.defaultBranch) return `"${branch}" is the default branch, and nothing is ever pushed to it.`;
  if (branch !== rules.branch) return `"${branch}" is not this work's branch ("${rules.branch}"); only that one leaves the box.`;
  return undefined;
}

function sizeProblem(bundle: Bundle, most: number): string | undefined {
  if (bundle.files.length > most) return `The bundle has ${bundle.files.length} files, and ${most} is the most that leaves a box.`;
  if (bundle.bytes.length > most) return `The bundle is ${bundle.bytes.length} bytes, and ${most} is the most that leaves a box.`;
  return undefined;
}

export const checkBundle: CheckBundle = (bundle, rules) => {
  const why = branchProblem(bundle.branch, rules);
  if (why !== undefined) return refuse(why);
  if (!rules.workflows) {
    const workflow = bundle.files.find(isWorkflow);
    if (workflow !== undefined) return refuse(`${normalPath(workflow)} is a workflows file, and the mandate does not allow those.`);
  }
  const big = sizeProblem(bundle, rules.most);
  return big === undefined ? fine : refuse(big);
};

import type { Plan, Step } from "../types.ts";

type Command = Extract<Step, { kind: "command" }>;

/** What `--apply` may run: `create` steps once there is a way in; `deploy` steps when no placeholder or setting is missing. */
export function runnable(plan: Plan): readonly Command[] {
  if (plan.blockers.length > 0) return [];
  return plan.steps.filter(
    (step): step is Command =>
      step.kind === "command" && (step.phase === "create" || (plan.placeholders.length === 0 && plan.absent.length === 0)),
  );
}

const line = (step: Step, index: number, will: ReadonlySet<Step>, apply: boolean): string => {
  const head = `${String(index + 1).padStart(2)}. ${step.title}`;
  if (step.kind === "manual") return `${head}\n    By hand: ${step.note}`;
  const state = !apply ? "" : will.has(step) ? "  [runs]" : "  [waits for what is missing below]";
  const given = step.stdin === undefined ? "" : `  (given on its input: ${step.stdin.join(", ")})`;
  return `${head}${state}\n    $ ${Object.entries(step.env ?? {})
    .map(([name, value]) => `${name}=${value} `)
    .join("")}${step.argv.join(" ")}${given}${step.note === undefined ? "" : `\n    ${step.note}`}`;
};

export function describe(plan: Plan, apply: boolean): string {
  const will = new Set<Step>(runnable(plan));
  const out = ["Staging setup for coworker-staging. No secret value is ever printed.", ""];
  out.push(...plan.steps.map((step, index) => line(step, index, will, apply)), "");
  if (plan.placeholders.length > 0) out.push(`Still to fill in wrangler.jsonc (REPLACE_AT_DEPLOY): ${plan.placeholders.join(", ")}`);
  if (plan.absent.length > 0) out.push(`Not there yet (pnpm credentials): ${plan.absent.join(", ")}`);
  for (const blocker of plan.blockers) out.push(`Blocked: ${blocker}`);
  out.push(apply ? "Running the steps marked [runs]." : "Dry run: nothing was run. Add --apply to run the steps above.");
  return out.join("\n");
}

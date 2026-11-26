import type { Evidence } from "~/modules/work/types.ts";
import type { ToolArgs } from "../types.ts";

/** A report's or a check's evidence as evidence, by this agent in this thread, at this time. What the model says of itself is not read. */
export function evidence(
  args: ToolArgs["report"] | ToolArgs["check"],
  by: { readonly agent: string; readonly thread: string },
  at: number,
): readonly Evidence[] {
  return args.evidence.map((one) => {
    const link = "link" in one ? one.link : undefined;
    return {
      check: one.check,
      met: one.met,
      says: one.says,
      ...(link === undefined ? {} : { link }),
      by: { agent: by.agent, thread: by.thread },
      at,
    };
  });
}

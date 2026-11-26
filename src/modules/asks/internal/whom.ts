import type { Asks } from "../types.ts";

type Input = Parameters<Asks["whom"]>[0];

export function whomOf(input: Input): string {
  const order = [input.answers, input.lender, input.asked, ...input.owners].filter((p): p is string => p !== undefined && p !== "");
  const here = order.find((p) => !input.away.includes(p));
  return here ?? order[0] ?? "";
}

import type { ToolArgs } from "../types.ts";
import { readers } from "./calls.ts";
import { record } from "./fields.ts";

type Read<T extends keyof ToolArgs> =
  | { readonly _tag: "Args"; readonly args: ToolArgs[T] }
  | { readonly _tag: "Wrong"; readonly says: string };

/** What a call said, narrowed to what the tool takes. What it took beyond that is left out. */
export function read<T extends keyof ToolArgs>(tool: T, args: unknown): Read<T> {
  const from = record(args);
  if (from === null) return { _tag: "Wrong", says: `A call to ${tool} must be an object of its arguments, as the tool takes them.` };
  const said: string[] = [];
  const made = readers[tool](from, said);
  if (made === undefined || said.length > 0) return { _tag: "Wrong", says: `${tool} was called wrong: ${said.join(" ")}` };
  return { _tag: "Args", args: made };
}

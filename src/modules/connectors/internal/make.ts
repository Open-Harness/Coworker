import type { Arg, ConnectorAction } from "../types.ts";
import type { Permission } from "~/modules/reach/types.ts";

/** An argument a model gives. */
export function arg(name: string, is: Arg["is"], needed: boolean, says: string): Arg {
  return { name, is, needed, says };
}

/** One action: what it does, the parts we fill in, how it starts, whether it shows outside, and what a model gives. */
export function act(
  id: string,
  does: string,
  fixed: readonly string[],
  starts: Permission,
  outside: boolean,
  ...args: readonly Arg[]
): ConnectorAction {
  return { id, does, fixed, args, starts, outside };
}

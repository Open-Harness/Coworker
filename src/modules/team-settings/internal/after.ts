import type { Loaded } from "~/modules/team-core/types.ts";

/** Runs `then` once `asking` worked, and gives the answer on either way. */
export async function after<T>(asking: Promise<Loaded<T>>, then: (value: T) => void): Promise<Loaded<T>> {
  const result = await asking;
  if (result._tag === "Loaded") then(result.value);
  return result;
}

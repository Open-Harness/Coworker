export type Tried<T> = { readonly _tag: "Done"; readonly value: T } | { readonly _tag: "Failed"; readonly why: string };

/**
 * One call on a box's handle, as a value. `BoxHandle`'s calls answer `Ran`, text or nothing, so a host that cannot answer
 * can only reject: this is the one place that catches it, and what was said is kept only to be told, never read for meaning.
 */
export async function attempt<T>(call: () => Promise<T>): Promise<Tried<T>> {
  try {
    return { _tag: "Done", value: await call() };
  } catch (error) {
    return { _tag: "Failed", why: error instanceof Error ? error.message : String(error) };
  }
}

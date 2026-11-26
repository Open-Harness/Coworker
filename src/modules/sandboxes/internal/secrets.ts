import type { UseResult } from "~/modules/vault/types.ts";
import type { Env, SandboxesDependencies, SecretRef } from "../types.ts";

const REFERENCE = /^\s*export\s+([A-Za-z_][A-Za-z0-9_]*)=vault:([A-Za-z0-9_.-]+)\s*$/u;

/** The secrets a setup names, and the script without those lines: what the container is given to run. */
export function splitSetup(setup: string): { readonly script: string; readonly refs: readonly SecretRef[] } {
  const refs: SecretRef[] = [];
  const lines = setup.split("\n").filter((line) => {
    const found = REFERENCE.exec(line);
    if (found === null) return true;
    refs.push({ env: found[1] ?? "", secret: found[2] ?? "" });
    return false;
  });
  return { script: lines.join("\n"), refs };
}

export type WithSecrets<T> = { readonly _tag: "Used"; readonly value: T } | { readonly _tag: "MissingSecret"; readonly name: string };

/**
 * Opens each named secret in turn and calls `fn` with all of them as environment, inside the innermost `use`: the
 * values exist for that one call. `redact` hides them in anything the call returns.
 */
export async function withSecrets<T>(
  secrets: SandboxesDependencies["secrets"],
  refs: readonly SecretRef[],
  fn: (env: Env, redact: (text: string) => string) => Promise<T>,
  env: Env = {},
  names: readonly (readonly [string, string])[] = [],
): Promise<WithSecrets<T>> {
  const [first, ...rest] = refs;
  if (first === undefined) {
    const redact = (text: string): string =>
      names.reduce((hidden, [value, name]) => (value === "" ? hidden : hidden.split(value).join(`[secret ${name}]`)), text);
    return { _tag: "Used", value: await fn(env, redact) };
  }
  const used: UseResult<WithSecrets<T>> = await secrets.use(first.secret, (value) =>
    withSecrets(secrets, rest, fn, { ...env, [first.env]: value }, [...names, [value, first.secret]]),
  );
  return used._tag === "Used" ? used.value : { _tag: "MissingSecret", name: first.secret };
}

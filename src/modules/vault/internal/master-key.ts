import type { MasterKey } from "../types.ts";
import { seal, unseal } from "./aes.ts";

const CONTEXT = "co-worker/data-key";

export function aesMasterKey(id: string, raw: Uint8Array<ArrayBuffer>): MasterKey {
  if (raw.byteLength !== 32) throw new Error("A master key is 32 bytes");
  return { id, wrap: (dataKey) => seal(raw, dataKey, CONTEXT), unwrap: (wrapped) => unseal(raw, wrapped, CONTEXT) };
}

/** A Secrets Store secret holding 32 random bytes in base64. Read on first use, not at startup. */
export function secretsStoreMasterKey(id: string, secret: { get(): Promise<string> }): MasterKey {
  let key: Promise<MasterKey> | undefined;
  const load = (): Promise<MasterKey> =>
    (key ??= secret.get().then((base64) =>
      aesMasterKey(
        id,
        Uint8Array.from(atob(base64.trim()), (char) => char.charCodeAt(0)),
      ),
    ));
  return { id, wrap: async (dataKey) => (await load()).wrap(dataKey), unwrap: async (wrapped) => (await load()).unwrap(wrapped) };
}

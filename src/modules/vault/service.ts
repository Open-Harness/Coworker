import { newDataKey, seal, unseal } from "./internal/aes.ts";
import { deleteSecret, ensureTables, listSecrets, readKey, readSealed, writeKey, writeSealed } from "./internal/store.ts";
import type { MasterKey, RewrapResult, UseResult, Vault, VaultDependencies } from "./types.ts";

export { aesMasterKey, secretsStoreMasterKey } from "./internal/master-key.ts";

const context = (name: string): string => `co-worker/secret/${name}`;

/** The data key in the clear, for one operation. Never kept on the vault. */
async function dataKey({ sql, masterKeys }: VaultDependencies, create: boolean): Promise<Uint8Array<ArrayBuffer> | undefined> {
  const stored = readKey(sql);
  if (stored === undefined) {
    if (!create) return undefined;
    const fresh = newDataKey();
    writeKey(sql, { wrapped: await masterKeys.current.wrap(fresh), masterKeyId: masterKeys.current.id });
    return fresh;
  }
  const master = [masterKeys.current, ...masterKeys.retired].find((key) => key.id === stored.masterKeyId);
  return master?.unwrap(stored.wrapped);
}

async function rewrap(dependencies: VaultDependencies): Promise<RewrapResult> {
  const { sql, masterKeys } = dependencies;
  const stored = readKey(sql);
  if (stored === undefined) return { _tag: "NoDataKey" };
  if (stored.masterKeyId === masterKeys.current.id) return { _tag: "AlreadyCurrent" };
  const key = await dataKey(dependencies, false);
  if (key === undefined) return { _tag: "NoMasterKeyFits", wrappedBy: stored.masterKeyId };
  const current: MasterKey = masterKeys.current;
  writeKey(sql, { wrapped: await current.wrap(key), masterKeyId: current.id });
  return { _tag: "Rewrapped", to: current.id };
}

export function openVault(dependencies: VaultDependencies): Vault {
  const { sql, clock, audit } = dependencies;
  ensureTables(sql);
  return {
    put: async (name, plaintext) => {
      const key = await dataKey(dependencies, true);
      if (key === undefined) throw new Error("The vault's data key is wrapped by a master key this Worker does not have");
      writeSealed(sql, name, await seal(key, new TextEncoder().encode(plaintext), context(name)), clock.now());
      audit({ action: "put", name, at: clock.now() });
    },
    use: async <T>(name: string, fn: (plaintext: string) => Promise<T> | T): Promise<UseResult<T>> => {
      const sealed = readSealed(sql, name);
      if (sealed === undefined) return { _tag: "NoSuchSecret", name };
      const key = await dataKey(dependencies, false);
      const opened = key === undefined ? undefined : await unseal(key, sealed, context(name));
      if (opened === undefined) return { _tag: "Undecryptable", name };
      audit({ action: "use", name, at: clock.now() });
      return { _tag: "Used", value: await fn(new TextDecoder().decode(opened)) };
    },
    list: () => listSecrets(sql),
    remove: (name) => {
      const removed = deleteSecret(sql, name);
      if (removed) audit({ action: "remove", name, at: clock.now() });
      return removed;
    },
    rewrap: () => rewrap(dependencies),
  };
}

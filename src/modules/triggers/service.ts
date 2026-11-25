import type { FileStore, Triggers } from "./types.ts";
import { gate, isAllowed } from "./internal/gate.ts";
import { DEFAULT_POLICY, policyOf } from "./internal/policy.ts";

const channels: Triggers["channels"] = (byKind) => ({
  send: async (outbound) => byKind[outbound.to.kind]?.send(outbound) ?? { _tag: "Gone", reason: `Nothing sends ${outbound.to.kind} here` },
});

export const triggers: Triggers = { gate, isAllowed, defaultPolicy: DEFAULT_POLICY, policyOf, channels };

/** The file store over an R2 bucket. */
export const r2Files = (bucket: R2Bucket): FileStore => ({
  put: async (key, body, type) => void (await bucket.put(key, body, { httpMetadata: { contentType: type } })),
  get: async (key) => {
    const object = await bucket.get(key);
    return object === null ? undefined : new Uint8Array(await object.arrayBuffer());
  },
});

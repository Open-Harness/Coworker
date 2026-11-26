import type { SandboxHost } from "../types.ts";

const REASON = "Containers are not set up for this deployment";

/** The host until Cloudflare Containers are bound (book section 3): every start says why it cannot. */
export const noContainers: SandboxHost = {
  prepare: async () => ({ _tag: "Unavailable", reason: REASON }),
  exec: async () => ({ _tag: "Unavailable", reason: REASON }),
};

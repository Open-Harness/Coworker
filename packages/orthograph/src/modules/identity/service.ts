import type { IdentityApi } from "./types.ts";

export const Identity: IdentityApi = {
  testPrincipals: Object.freeze({ kind: "identity", which: "test-principals" }),
  betterAuth: Object.freeze({ kind: "identity", which: "better-auth" }),
};

import type { DeployApi } from "./types.ts";

export const Deploy: DeployApi = {
  worker: (spec) => Object.freeze({ kind: "deployment", how: "worker", domain: spec?.domain ?? null }),
  site: (spec) => Object.freeze({ kind: "deployment", how: "site", domain: spec?.domain ?? null }),
  npm: (spec) => Object.freeze({ kind: "publication", how: "npm", tag: spec?.tag ?? null }),
  homebrew: (spec) => Object.freeze({ kind: "publication", how: "homebrew", tap: spec.tap }),
  binaries: (spec) => Object.freeze({ kind: "publication", how: "binaries", on: spec.on }),
};

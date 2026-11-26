import type { CloudApi, Database } from "./types.ts";

const d1 = Object.assign(
  (): Database => Object.freeze({ kind: "database", which: "d1" }),
  { local: (): Database => Object.freeze({ kind: "database", which: "d1-local" }) },
);

export const Cloud: CloudApi = {
  cloudflare: ({ database }) => Object.freeze({ kind: "cloud", provider: "cloudflare", database }),
  d1,
};

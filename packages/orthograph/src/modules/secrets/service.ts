import type { SecretsApi } from "./types.ts";

export const Secrets: SecretsApi = {
  secret: {
    generated: () => Object.freeze({ kind: "secret", how: "generated" }),
    stored: () => Object.freeze({ kind: "secret", how: "stored" }),
  },
};

import type { EnvironmentsApi } from "./types.ts";

export const Environments: EnvironmentsApi = {
  environment: (spec) => Object.freeze({ ...spec, kind: "environment" }),
};

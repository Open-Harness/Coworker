import type { TelemetryApi } from "./types.ts";

export const Telemetry: TelemetryApi = {
  sink: {
    local: () => Object.freeze({ kind: "sink", which: "local" }),
    axiom: ({ group }) => Object.freeze({ kind: "sink", which: "axiom", group }),
  },
};

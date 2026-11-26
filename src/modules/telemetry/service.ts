import type { Span, Telemetry } from "./types.ts";

const nowhere: Span = { event: () => undefined, end: () => undefined };

/** Until the Cloudflare adapter is built: every span goes nowhere. */
export const noTelemetry: Telemetry = { span: () => nowhere };

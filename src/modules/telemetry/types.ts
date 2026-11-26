/*
 * Where spans go. pi-durable's Harness takes a pi-telemetry `TelemetryContext` and emits `pi.durable.*` spans; pi-ai emits
 * `pi.ai.request` with tokens, cost and stop reason. This is the seam that becomes one: an adapter onto Cloudflare Workers
 * Observability (`tracing.enterSpan` from `cloudflare:workers`, wrangler `observability.traces`). Attributes carry ids and
 * control facts, never a message, an argument or a secret.
 *
 * Not built: spans go nowhere.
 */

export type Attributes = Readonly<Record<string, string | number | boolean>>;

export interface Span {
  readonly event: (name: string, attributes?: Attributes) => void;
  readonly end: (status: "ok" | "error", attributes?: Attributes) => void;
}

export interface Telemetry {
  readonly span: (name: string, attributes?: Attributes) => Span;
}

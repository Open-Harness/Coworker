# telemetry

Where spans go: Cloudflare Workers Observability.

Not built. `noTelemetry` sends every span nowhere.

## What it must do

- **Be pi-durable's `telemetry` option:** a pi-telemetry `TelemetryContext` whose spans land in Cloudflare's traces (`tracing.enterSpan` from `cloudflare:workers`). pi-telemetry has a conformance suite; pass it. pi-telemetry is not a dependency yet.
- **Turn on logs and traces in wrangler for every environment,** staging included: `observability.enabled` and `traces.enabled`. Write logs as structured `console.log({...})`, from `main.ts` only.
- **Make every agent turn, tool call, park and hold a span with why.** The jobs of 26 November stalled with nothing to read (postmortem, `docs/postmortem-2026-11-26.md`).
- **Keep attributes to ids and control facts:** no messages, arguments, results or secrets. That is pi-durable's rule too.

Orthograph speaks OpenTelemetry and has no Cloudflare sink. This adapter is the one to give it.

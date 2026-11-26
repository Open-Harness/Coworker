import { describe, it } from "vitest";

describe("telemetry", () => {
  it.todo("a pi-telemetry TelemetryContext over Cloudflare's tracing: pi.durable.* and pi.ai.request spans arrive with their attributes");
  it.todo("no span attribute holds a message, a tool's arguments, a result or a secret");
  it.todo("a work that waits says why on a span, so a stall is found by reading, not by guessing");
});

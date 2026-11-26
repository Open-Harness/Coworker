import { Blueprint } from "orthograph";

// A row kept inside one piece of work's Durable Object: its threads, its action calls, the conversations it follows.
// The settled decision: one object per piece of work, which holds one Pi Harness (docs/pi-durable-audit.md). Delta D3.
export default Blueprint.store.kind("actor.of.work");

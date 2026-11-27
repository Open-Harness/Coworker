import { Blueprint } from "orthograph";

// A row kept inside one workspace's Durable Object: the co-worker, the managers and their playbooks, intake, the inbox.
// Orthograph has `actor` (one object per instance of a thing) but no "inside another thing's object": delta D3.
export default Blueprint.store.kind("actor.of.workspace");

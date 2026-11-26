import type { Clock } from "~/modules/clock/types.ts";
import type { Store, StoreAnswer, StoreOp } from "../types.ts";

/**
 * The workspace's object as the console's store: each call is one op, and its answer must be the op's own. `ask` throws
 * only for an answer that is not the op's own, or for an object that says it is not provisioned: both are bugs, because the
 * route that builds a console has had the object answer `describe` as found, and the object answers its own ops. The
 * `Store` has no place for a failure in its calls (they answer rows), so a console never sees a half-answer.
 */
export type Send = (op: StoreOp) => Promise<StoreAnswer | { readonly _tag: "NotProvisioned" }>;

export function remoteStore(send: Send, clock: Clock): Store {
  async function ask<K extends StoreAnswer["op"]>(op: StoreOp, expect: K): Promise<Extract<StoreAnswer, { op: K }>> {
    const answer = await send(op);
    if (!("op" in answer) || answer.op !== expect) throw new Error(`The workspace has no console store (${op.op})`);
    return answer as Extract<StoreAnswer, { op: K }>;
  }
  return {
    claim: async (key, doing) => {
      const answer = await ask({ op: "claim", key, doing, at: clock.now() }, "claim");
      return answer.is === "done" && answer.did !== undefined
        ? { is: "done", did: answer.did }
        : { is: answer.is === "busy" ? "busy" : "yours" };
    },
    settle: async (key, did) => void (await ask({ op: "settle", key, did }, "settle")),
    audit: async (row) => void (await ask({ op: "audit.add", row }, "audit.add")),
    auditLines: async (query) => {
      const { lines, next } = await ask({ op: "audit.list", ...query }, "audit.list");
      return { lines, next };
    },
    setting: async (name) => (await ask({ op: "setting.get", name }, "setting.get")).value,
    set: async (name, value) => void (await ask({ op: "setting.set", name, value }, "setting.set")),
    managers: async () => (await ask({ op: "manager.list" }, "manager.list")).rows,
    addManager: async (row) => void (await ask({ op: "manager.add", row }, "manager.add")),
    items: async (manager, query) => {
      const { rows, next } = await ask({ op: "item.list", manager, ...query }, "item.list");
      return { rows, next };
    },
  };
}

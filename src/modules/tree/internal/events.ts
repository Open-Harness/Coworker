import type { Problem } from "~/modules/playbook/types.ts";
import type { Reach } from "~/modules/reach/types.ts";
import { reaches } from "~/modules/reach/service.ts";
import type { Grown, ManagerNode, TreeEvent } from "../types.ts";
import { cut } from "./cut.ts";
import { find, under } from "./find.ts";

type Event<K extends TreeEvent["is"]> = Extract<TreeEvent, { is: K }>;

export function refuse(id: string, says: readonly string[]): Grown {
  const problems: Problem[] = says.map((one) => ({ at: `managers/${id}`, says: one }));
  return { _tag: "Refused", why: says.join(" "), problems };
}

function grown(nodes: readonly ManagerNode[], narrowed: readonly string[] = [], work: "stays" | "up" | "ends" = "stays"): Grown {
  return { _tag: "Grown", nodes, narrowed, work };
}

function replace(nodes: readonly ManagerNode[], id: string, change: Partial<ManagerNode>): readonly ManagerNode[] {
  return nodes.map((node) => (node.id === id ? { ...node, ...change } : node));
}

/** The reach a manager under `above` may have: that manager's, or the whole at the top. */
function reachAbove(nodes: readonly ManagerNode[], above: string | null, whole: Reach): Reach {
  return above === null ? whole : (find(nodes, above)?.reach ?? whole);
}

/** Why `above` cannot have anything under it, or null. */
function noPlaceUnder(nodes: readonly ManagerNode[], above: string | null): string | null {
  if (above === null) return null;
  const there = find(nodes, above);
  if (there === undefined) return `There is no manager ${above} to be under.`;
  if (there.state === "retired") return `${above} is retired, so nothing can be under it.`;
  return null;
}

export function make(nodes: readonly ManagerNode[], event: Event<"make">, whole: Reach): Grown {
  const made = event.node;
  if (find(nodes, made.id) !== undefined) return refuse(made.id, [`There is already a manager ${made.id}.`]);
  const none = noPlaceUnder(nodes, made.above);
  if (none !== null) return refuse(made.id, [none]);
  const wider = reaches.wider(reachAbove(nodes, made.above, whole), made.reach);
  if (wider.length > 0) return refuse(made.id, wider);
  return grown([...nodes, made]);
}

/** Cuts everything below `id` to fit what is above it, all the way down. Says which really changed. */
function cutBelow(nodes: readonly ManagerNode[], id: string): { nodes: readonly ManagerNode[]; narrowed: readonly string[] } {
  let now = nodes;
  const narrowed: string[] = [];
  let layer = [id];
  while (layer.length > 0) {
    const next: string[] = [];
    for (const child of now.filter((node) => node.above !== null && layer.includes(node.above))) {
      const parent = find(now, child.above ?? "");
      const fitted = parent === undefined ? child.reach : cut(parent.reach, child.reach);
      if (fitted !== child.reach) {
        narrowed.push(child.id);
        now = replace(now, child.id, { reach: fitted });
      }
      next.push(child.id);
    }
    layer = next;
  }
  return { nodes: now, narrowed };
}

export function reachOf(nodes: readonly ManagerNode[], event: Event<"reach">, whole: Reach): Grown {
  const node = find(nodes, event.id);
  if (node === undefined) return refuse(event.id, [`There is no manager ${event.id}.`]);
  if (node.state === "retired") return refuse(event.id, [`${event.id} is retired, so its reach cannot change.`]);
  const wider = reaches.wider(reachAbove(nodes, node.above, whole), event.reach);
  if (wider.length > 0) return refuse(event.id, wider);
  const below = cutBelow(replace(nodes, event.id, { reach: event.reach }), event.id);
  return grown(below.nodes, below.narrowed);
}

export function move(nodes: readonly ManagerNode[], event: Event<"move">, whole: Reach): Grown {
  const node = find(nodes, event.id);
  if (node === undefined) return refuse(event.id, [`There is no manager ${event.id}.`]);
  if (node.state === "retired") return refuse(event.id, [`${event.id} is retired, so it cannot be moved.`]);
  const none = noPlaceUnder(nodes, event.above);
  if (none !== null) return refuse(event.id, [none]);
  const loop = event.above !== null && (event.above === event.id || under(nodes, event.id).some((n) => n.id === event.above));
  if (loop) return refuse(event.id, [`${event.id} cannot go under ${event.above}: that would make a loop.`]);
  const wider = reaches.wider(reachAbove(nodes, event.above, whole), node.reach);
  if (wider.length > 0)
    return refuse(event.id, [`${event.id} has more than ${event.above ?? "the whole"} has, so it cannot go there.`, ...wider]);
  return grown(replace(nodes, event.id, { above: event.above }));
}

export function pause(nodes: readonly ManagerNode[], event: Event<"pause" | "go on">): Grown {
  const node = find(nodes, event.id);
  if (node === undefined) return refuse(event.id, [`There is no manager ${event.id}.`]);
  if (node.state === "retired") return refuse(event.id, [`${event.id} is retired for good.`]);
  return grown(replace(nodes, event.id, { state: event.is === "pause" ? "paused" : "runs" }));
}

export function rename(nodes: readonly ManagerNode[], event: Event<"rename">): Grown {
  if (find(nodes, event.id) === undefined) return refuse(event.id, [`There is no manager ${event.id}.`]);
  return grown(replace(nodes, event.id, { name: event.name }));
}

export function retire(nodes: readonly ManagerNode[], event: Event<"retire">): Grown {
  const node = find(nodes, event.id);
  if (node === undefined) return refuse(event.id, [`There is no manager ${event.id}.`]);
  if (node.state === "retired") return refuse(event.id, [`${event.id} is already retired.`]);
  if (event.open._tag === "end" && event.open.why.trim() === "")
    return refuse(event.id, [`Open work of ${event.id} cannot end without a reason.`]);
  const moved = nodes.map((one) => {
    if (one.id === event.id) return { ...one, state: "retired" as const };
    return one.above === event.id ? { ...one, above: node.above } : one;
  });
  return grown(moved, [], event.open._tag === "up" ? "up" : "ends");
}

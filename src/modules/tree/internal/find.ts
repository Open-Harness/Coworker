import type { ManagerNode } from "../types.ts";

export function find(nodes: readonly ManagerNode[], id: string): ManagerNode | undefined {
  return nodes.find((node) => node.id === id);
}

/** Every manager below `id`, at any depth, nearest first. `null`: all of them. */
export function under(nodes: readonly ManagerNode[], id: string | null): readonly ManagerNode[] {
  if (id === null) return nodes;
  const out: ManagerNode[] = [];
  const seen = new Set<string>([id]);
  let layer = [id];
  while (layer.length > 0) {
    const next: string[] = [];
    for (const node of nodes) {
      if (node.above === null || !layer.includes(node.above) || seen.has(node.id)) continue;
      seen.add(node.id);
      out.push(node);
      next.push(node.id);
    }
    layer = next;
  }
  return out;
}

/** Every manager above `id`, nearest first. The co-worker is not one. */
export function above(nodes: readonly ManagerNode[], id: string): readonly ManagerNode[] {
  const out: ManagerNode[] = [];
  const seen = new Set<string>([id]);
  let at = find(nodes, id)?.above ?? null;
  while (at !== null && !seen.has(at)) {
    seen.add(at);
    const node = find(nodes, at);
    if (node === undefined) break;
    out.push(node);
    at = node.above;
  }
  return out;
}

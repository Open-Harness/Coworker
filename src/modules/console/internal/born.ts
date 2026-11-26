import { playbooks } from "~/modules/playbook/service.ts";
import type { Files, Problem } from "~/modules/playbook/types.ts";
import { tree } from "~/modules/tree/service.ts";
import type { ManagerNode } from "~/modules/tree/types.ts";
import type { ConsoleDeps } from "../types.ts";
import { accountsOf, surroundings, wholeOf } from "./around.ts";

/* A manager made from files that are not a template's: its own copy as version 1, its place in the tree, then registered. */

export type Born = { readonly _tag: "Born"; readonly id: string } | { readonly _tag: "Problems"; readonly problems: readonly Problem[] };

export async function born(c: ConsoleDeps, input: { readonly id: string; readonly files: Files }): Promise<Born> {
  const read = playbooks.read(input.files);
  if (read._tag === "Problems") return { _tag: "Problems", problems: read.problems };
  const { playbook } = read;
  const whole = wholeOf(await accountsOf(c));
  const problems = playbooks.check(playbook, await surroundings(c, whole));
  if (problems.length > 0) return { _tag: "Problems", problems };
  const rows = await c.store.managers();
  const node: ManagerNode = {
    id: input.id,
    name: playbook.name,
    above: null,
    answers: c.who.id,
    template: null,
    version: 1,
    state: "runs",
    reach: { grants: playbook.reach.grants, limits: playbook.reach.limits },
  };
  const grown = tree.grow(
    rows.map((row) => row.node),
    { is: "make", node },
    whole,
  );
  if (grown._tag === "Refused")
    return { _tag: "Problems", problems: grown.problems.length > 0 ? grown.problems : [{ at: "reach.yaml", says: grown.why }] };
  const at = c.clock.now();
  const { objectId, store } = c.managers.mint(c.workspace.region);
  await store.open({ id: node.id, workspace: c.workspace.id, name: node.name, template: null, by: c.who.id, at, files: input.files });
  const hears = playbook.triggers.flatMap((trigger) =>
    trigger.on && trigger.by === "event" && (trigger.account === "github" || trigger.account === "email") ? [trigger.place] : [],
  );
  await c.store.addManager({ node, objectId, region: c.workspace.region, by: c.who.id, at, hears: [...new Set(hears)] });
  return { _tag: "Born", id: node.id };
}

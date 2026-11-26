import { Blueprint } from "orthograph";
import { Address, Cents, People, Region, Title } from "../../values/coworker.ts";

// An actor: one Durable Object per workspace holds everything of it that is not a piece of work or a chat. Its name and
// address are also a row in D1, so a person can list their workspaces: a projection Orthograph can't say (delta D2).
export const Workspace = Blueprint.thing({
  description: "One workspace: a name, an address, a region, its people with their roles, one co-worker, managers in a tree.",
  code: "WS",
  lives: "actor",
  fields: {
    id: Blueprint.id("ws"),
    name: Title,
    address: Address,
    region: Region,
    people: People,
    perDay: Cents,
    tellAt: Cents,
  },
});

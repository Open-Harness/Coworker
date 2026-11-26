import { above, under } from "./internal/find.ts";
import { make, move, pause, reachOf, rename, retire, refuse } from "./internal/events.ts";
import { roll } from "./internal/roll.ts";
import type { Tree } from "./types.ts";

export const tree: Tree = {
  grow: (nodes, event, whole) => {
    switch (event.is) {
      case "make":
        return make(nodes, event, whole);
      case "move":
        return move(nodes, event, whole);
      case "rename":
        return rename(nodes, event);
      case "reach":
        return reachOf(nodes, event, whole);
      case "pause":
      case "go on":
        return pause(nodes, event);
      case "retire":
        return retire(nodes, event);
      default:
        return refuse("tree", ["That is not something that can be done to a manager."]);
    }
  },
  under,
  above,
  roll,
};

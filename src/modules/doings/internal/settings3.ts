import type { Doing } from "../types.ts";
import { d, f } from "./make.ts";

export const settings3: readonly Doing[] = [
  d(
    "workspace.delete",
    "Settings",
    "Owner",
    "off",
    true,
    "workspace",
    "Delete the workspace",
    "Delete workspace",
    "deleted the workspace {name}",
    null,
    f("name", "text"),
  ),
  d(
    "workspace.take_back",
    "Settings",
    "Owner",
    "off",
    false,
    "workspace",
    "Take back everything lent out",
    "Take back",
    "took back everything lent out",
    null,
  ),
];

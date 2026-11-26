import { find } from "./internal/find.ts";
import { may } from "./internal/may.ts";
import { offered } from "./internal/offered.ts";
import { registry } from "./internal/registry.ts";
import { sentence } from "./internal/sentence.ts";
import { walk } from "./internal/walk.ts";
import type { Doings } from "./types.ts";

export const doings: Doings = {
  all: registry,
  may: (doing, who, onBehalfOf) => may(registry, doing, who, onBehalfOf),
  offered: (who, page) => offered(registry, who, page),
  find: (words, who, things) => find(registry, words, who, things),
  sentence: (doing, values, by) => sentence(registry, doing, values, by),
  walk: (doing, values) => walk(registry, doing, values),
};

import { fillTemplate } from "./internal/fill.ts";
import { newerOf } from "./internal/newer.ts";
import { readTemplate } from "./internal/read.ts";
import { saveAsTemplate } from "./internal/save.ts";
import type { Templates } from "./types.ts";

export const templates: Templates = {
  read: readTemplate,
  fill: fillTemplate,
  saveAs: saveAsTemplate,
  newer: newerOf,
};

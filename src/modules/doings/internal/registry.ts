import type { Doing } from "../types.ts";
import { managers1 } from "./managers1.ts";
import { managers2 } from "./managers2.ts";
import { managers3 } from "./managers3.ts";
import { work1 } from "./work1.ts";
import { work2 } from "./work2.ts";
import { console1 } from "./console1.ts";
import { console2 } from "./console2.ts";
import { console3 } from "./console3.ts";
import { settings1 } from "./settings1.ts";
import { settings2 } from "./settings2.ts";
import { settings3 } from "./settings3.ts";

export const registry: readonly Doing[] = [
  ...managers1,
  ...managers2,
  ...managers3,
  ...work1,
  ...work2,
  ...console1,
  ...console2,
  ...console3,
  ...settings1,
  ...settings2,
  ...settings3,
];

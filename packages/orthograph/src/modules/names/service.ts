import type { FrameworkNames } from "./types.ts";

const short = "ortho";
const scope = "@orthograph";

export const Names: FrameworkNames = Object.freeze({
  product: "Orthograph",
  short,
  scope,
  frontDoor: "orthograph",
  pkg: <const N extends string>(name: N) => `${scope}/${name}` as const,
  variable: <const S extends string>(suffix: S) => `ORTHO_${suffix}` as const,
  folder: `.${short}`,
  config: `${short}.config.ts`,
});

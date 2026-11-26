import { allowed, mandate, narrow } from "./internal/mandate.ts";
import { wider } from "./internal/wider.ts";
import type { Reaches } from "./types.ts";

export const reaches: Reaches = {
  wider,
  handOn: (whole, part) => {
    const why = wider(whole, part);
    return why.length === 0 ? { _tag: "Handed", reach: part } : { _tag: "Wider", why };
  },
  mandate,
  narrow,
  allowed,
};

import type { Doing, Who } from "../types.ts";
import { may } from "./may.ts";

/** What is not off for them, and on the page asked for if one is. */
export function offered(all: readonly Doing[], who: Who, page?: string): readonly Doing[] {
  return all.filter((x) => (page === undefined || x.at.page === page) && may(all, x.id, who).is !== "off");
}

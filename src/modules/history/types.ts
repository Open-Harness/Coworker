import type { Context } from "@earendil-works/chord/context";
import type { Harness } from "@earendil-works/pi-durable";
import type { SearchMatch } from "~/modules/protocol/types.ts";

export interface SearchResult {
  readonly matches: readonly SearchMatch[];
  readonly truncated: boolean;
}
/** Case-insensitive substring search over what people and the assistant said in the chats of a workspace. */
export type SearchHistory = (harness: Pick<Harness, "commit">, term: string, context: Context) => Promise<SearchResult>;

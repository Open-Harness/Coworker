import { isRecord, listAt, numberAt, type Json } from "./payload.ts";

const PAGE = 100;
/** More pages than any installation we would list: a stop, not a limit someone meets. */
const MAX_PAGES = 50;

/** Every repo of a list of GitHub's, whatever its length. `undefined` if a page does not come, so a part is never taken for the whole. */
export async function allRepos(send: typeof fetch, address: string, authorization: string): Promise<readonly Json[] | undefined> {
  const repos: Json[] = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const response = await send(`${address}?per_page=${PAGE}&page=${page}`, {
      headers: { authorization, accept: "application/vnd.github+json", "user-agent": "co-worker" },
    });
    const value: unknown = await response.json().catch(() => undefined);
    if (response.status !== 200 || !isRecord(value)) return undefined;
    const found = listAt(value, "repositories");
    repos.push(...found);
    if (found.length < PAGE || (numberAt(value, "total_count") ?? Number.POSITIVE_INFINITY) <= page * PAGE) return repos;
  }
  return undefined;
}

import type { Api } from "./types.ts";

function notBuilt(what: string): never {
  throw new Error(`Not built: ${what}`);
}

/** The page's client. The server's side is in `http`, and goes by the same map. */
export const createApi = (_: { readonly fetch: typeof fetch; readonly workspace: string }): Api => notBuilt("api.createApi");

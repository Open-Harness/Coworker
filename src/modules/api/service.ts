import { createClient, createOutside as outside } from "./internal/client.ts";
import type { Answer, Api } from "./types.ts";

/** The page's client. The server's side is in `http`, and goes by the same map. */
export const createApi = ({ fetch: send, workspace }: { readonly fetch: typeof fetch; readonly workspace: string }): Api =>
  createClient(send, workspace);

/** Reads and changes outside any workspace: who is signed in, the ways in. Whole paths; the answer is `unknown` until the caller narrows it. */
export const createOutside = (
  send: typeof fetch,
): {
  readonly get: (path: string) => Promise<Answer<unknown>>;
  readonly post: (path: string, body: unknown) => Promise<Answer<unknown>>;
} => outside(send);

import type { BoardView, ChatLine, RunView } from "~/modules/manager/types.ts";
import type { EventEntry } from "~/modules/workspace/types.ts";
import { provision } from "./internal/seed.ts";
import { signIn } from "./internal/session.ts";
import type { LiveApp } from "./types.ts";

export { isFailed } from "./types.ts";

export const liveApp: LiveApp = {
  signIn,
  provision,
  board: async (session, { base }) => (await session.json<{ board: BoardView }>("GET", base)).board,
  events: async (session, { base }) => (await session.json<{ events: readonly EventEntry[] }>("GET", `${base}/events`)).events,
  chat: (session, { base }, text, requestId) => session.send("POST", `${base}/chat`, { text, requestId }),
  run: (session, { base }, runId) => session.json<{ run: RunView; lines: readonly ChatLine[] }>("GET", `${base}/runs/${runId}`),
};

export type { Failed, Fetch, LiveApp, Provisioned, Seed, Session, SignIn } from "./types.ts";

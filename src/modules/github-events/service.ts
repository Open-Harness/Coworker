import type { GithubEvents } from "./types.ts";

function notBuilt(what: string): never {
  throw new Error(`Not built: ${what}`);
}

export const githubEvents: GithubEvents = {
  read: () => notBuilt("githubEvents.read"),
  asked: () => notBuilt("githubEvents.asked"),
  keep: () => notBuilt("githubEvents.keep"),
  stateOf: () => notBuilt("githubEvents.stateOf"),
  told: () => notBuilt("githubEvents.told"),
  withHead: () => notBuilt("githubEvents.withHead"),
  closes: () => notBuilt("githubEvents.closes"),
  asWork: () => notBuilt("githubEvents.asWork"),
};

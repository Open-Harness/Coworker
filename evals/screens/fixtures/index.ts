import type { Fixture } from "./read.ts";
import { CONNECTORS } from "./connectors.ts";
import { COWORKER } from "./coworker.ts";
import { DOOR } from "./door.ts";
import { MAKING, MAKING_WRITES } from "./making.ts";
import { MANAGERS } from "./managers.ts";
import { PLAYBOOKS } from "./playbooks.ts";
import { SETTINGS } from "./settings.ts";
import { WORKSPACE } from "./workspace.ts";

/** 09:54 on Wednesday 25 November 2026, in Copenhagen. */
export const AT = new Date("2026-11-25T08:54:00Z");
export const HEADERS = { "content-type": "application/json" };
const map = (...all: readonly (readonly Fixture[])[]): Readonly<Record<string, unknown>> => Object.fromEntries(all.flat());

/** Reads under `/api/ws/acme`, by their path and query. */
export const READS = map(WORKSPACE, COWORKER, SETTINGS, MANAGERS, PLAYBOOKS, CONNECTORS, MAKING);
/** Answers to POSTs, by path. */
export const WRITES = map(MAKING_WRITES);
/** Whole paths outside `/api/ws`: who you are, ways in, your workspaces. */
export const OTHERS = map(DOOR);

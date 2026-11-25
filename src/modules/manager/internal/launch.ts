import { PLAIN_AGENT, type RunAgent } from "~/modules/agents/types.ts";
import type { AgentLookup, ManagerWorkspace } from "../types.ts";

/*
 * What a run is started with, found out before the call's commit because it asks the workspace: the saved agent as it
 * is now (a run keeps that, whatever happens to the agent later) and whether the model it asked for can be used.
 */

export const DEFAULT_AGENT = PLAIN_AGENT;

export type Launch =
  | { readonly kind: "plain"; readonly modelNotice?: string }
  | { readonly kind: "agent"; readonly agent: RunAgent; readonly modelNotice?: string }
  | { readonly kind: "gone"; readonly message: string };

const goneWords = (name: string, names: readonly string[]): string =>
  `The agent ${name} is gone: it was deleted from the workspace, or never made. ` +
  (names.length === 0 ? "The workspace has no saved agents." : `The agents there are: ${names.join(", ")}.`);

async function noticeFor(workspace: ManagerWorkspace, agent: RunAgent | undefined): Promise<{ readonly modelNotice?: string }> {
  const route = await workspace.modelRoute(agent?.model ?? undefined).catch(() => undefined);
  return route?._tag === "Route" && route.notice !== undefined ? { modelNotice: route.notice } : {};
}

/** What the workspace says when the model chosen for a caller could not be used and another answers. */
export async function modelNoticeOf(workspace: ManagerWorkspace): Promise<string | undefined> {
  const route = await workspace.modelRoute().catch(() => undefined);
  return route?._tag === "Route" ? route.notice : undefined;
}

/** The agent a call names, as a run starting now takes it. Without an answer from the workspace nothing starts. */
export async function launchFor(workspace: ManagerWorkspace, name: string | undefined): Promise<Launch> {
  const wanted = name?.trim() === "" ? undefined : name?.trim();
  const named = wanted !== undefined && wanted !== DEFAULT_AGENT;
  try {
    const found: AgentLookup = await workspace.agent(wanted ?? DEFAULT_AGENT);
    if (found._tag === "Found") return { kind: "agent", agent: found.agent, ...(await noticeFor(workspace, found.agent)) };
    if (found._tag === "Gone" && named) return { kind: "gone", message: goneWords(wanted, found.names) };
    return { kind: "plain", ...(await noticeFor(workspace, undefined)) };
  } catch {
    // Starting it plain would give it tools and a model nobody chose for it.
    return { kind: "gone", message: `The workspace did not answer, so the agent ${wanted ?? DEFAULT_AGENT} could not be read. Try again.` };
  }
}

import type { AgentConfig } from "~/modules/agent-config/types.ts";
import type { AdminCommand, CommandErrorCode, CommandOutcome, ModelOption } from "~/modules/protocol/types.ts";
import type { AssignedAgent } from "~/modules/chat-host/types.ts";
import type { Drafter } from "../types.ts";
import type { AgentStore } from "./agent-store.ts";
import type { Changed } from "./lifecycle.ts";

const DRAFT_MS = 90_000;
const refused = (code: CommandErrorCode, message: string): CommandOutcome => ({ ok: false, error: { code, message } });
const done: CommandOutcome = { ok: true, output: { kind: "done" } };
const gone: Changed = { outcome: refused("not_found", "That agent or version does not exist") };

interface Office {
  readonly agents: AgentStore;
  readonly models: readonly ModelOption[];
  readonly draft: Drafter;
}

const isMissing = ({ model }: AgentConfig, models: readonly ModelOption[]): boolean =>
  model !== undefined && models.every(({ provider, modelId }) => provider !== model.provider || modelId !== model.modelId);

function save(
  { agents }: Office,
  command: Extract<AdminCommand, { type: "agent.save" }>,
  by: string,
  requestId: string,
  now: number,
): Changed {
  const saved = agents.save({ id: command.agentId, basedOn: command.basedOn, config: command.config, by, requestId, now });
  switch (saved.kind) {
    case "saved":
      return { outcome: done, events: [{ type: "agent.changed", agent: saved.row }] };
    case "conflict":
      return { outcome: refused("conflict", "Someone saved another version meanwhile. Load it before you save") };
    case "deleted":
      return { outcome: refused("not_found", "That agent was deleted") };
  }
}

function deploy({ agents, models }: Office, command: Extract<AdminCommand, { type: "agent.deploy" }>, by: string, now: number): Changed {
  const config = agents.config(command.agentId, command.version);
  if (config === undefined) return gone;
  if (isMissing(config, models)) return { outcome: refused("rejected", "The model of that version is not available here") };
  const row = agents.deploy(command.agentId, command.version, command.to, by, now);
  return row === undefined ? gone : { outcome: done, events: [{ type: "agent.changed", agent: row }] };
}

async function draft(office: Office, description: string): Promise<Changed> {
  const drafted = await office.draft(description, AbortSignal.timeout(DRAFT_MS));
  return drafted.ok
    ? { outcome: { ok: true, output: { kind: "agent", config: drafted.config } } }
    : { outcome: refused(drafted.reason, drafted.message) };
}

export async function runAdmin(
  office: Office,
  command: AdminCommand & { readonly requestId: string },
  by: string,
  now: number,
): Promise<Changed> {
  const { agents } = office;
  switch (command.type) {
    case "agent.save":
      return save(office, command, by, command.requestId, now);
    case "agent.deploy":
      return deploy(office, command, by, now);
    case "agent.retire": {
      const row = agents.retire(command.agentId);
      return row === undefined ? gone : { outcome: done, events: [{ type: "agent.changed", agent: row }] };
    }
    case "agent.delete":
      agents.remove(command.agentId, now);
      return { outcome: done, events: [{ type: "agent.removed", agentId: command.agentId }] };
    case "agent.read": {
      const config = agents.config(command.agentId, command.version);
      return config === undefined ? gone : { outcome: { ok: true, output: { kind: "agent", config } } };
    }
    case "agent.draft":
      return draft(office, command.description);
  }
}

/** What a new chat with this agent runs: the deployed version, if this workspace may use it. */
export function assigned(agents: AgentStore, agentId: string, workspaceId: string): AssignedAgent | undefined {
  const deployment = agents.find(agentId)?.deployment;
  if (deployment === undefined) return undefined;
  if (deployment.to !== "all" && !deployment.to.includes(workspaceId)) return undefined;
  const config = agents.config(agentId, deployment.version);
  return config === undefined ? undefined : { stamp: { id: agentId, name: config.name, version: deployment.version }, config };
}

export const notDeployed: Changed = { outcome: refused("rejected", "That agent is not available in this workspace") };
export const notAdmin: Changed = { outcome: refused("forbidden", "Only an administrator may do that") };

import { arr, int, lit, obj, opt, str, union } from "@earendil-works/pi-schema";
import { agentConfig } from "~/modules/agent-config/service.ts";
import { LIMITS } from "./limits.ts";
import { natural, positive, requestId, text, uuid } from "./values.ts";

const deployedTo = union([lit("all"), arr(uuid, { minItems: 1, maxItems: 500 })]);

export const adminCommands = [
  obj({ type: lit("agent.save"), requestId, agentId: uuid, basedOn: natural, config: agentConfig }),
  obj({ type: lit("agent.deploy"), requestId, agentId: uuid, version: positive, to: deployedTo }),
  obj({ type: lit("agent.retire"), requestId, agentId: uuid }),
  obj({ type: lit("agent.delete"), requestId, agentId: uuid }),
  obj({ type: lit("agent.read"), requestId, agentId: uuid, version: positive }),
  obj({ type: lit("agent.draft"), requestId, description: text(LIMITS.draft) }),
] as const;

const open = { open: true } as const;
const deployment = obj(
  {
    version: int(),
    to: union([lit("all"), arr(str())]),
    at: int(),
    by: str(),
    name: str(),
    description: str(),
  },
  open,
);
export const agentStamp = obj({ id: str(), name: str(), version: int() }, open);
export const agentRow = obj(
  {
    id: str(),
    config: agentConfig,
    version: int(),
    versions: arr(obj({ version: int(), savedAt: int(), savedBy: str() }, open)),
    createdAt: int(),
    createdBy: str(),
    deployment: opt(deployment),
  },
  open,
);
export const agentEvents = [
  obj({ type: lit("agent.changed"), agent: agentRow }, open),
  obj({ type: lit("agent.removed"), agentId: str() }, open),
] as const;

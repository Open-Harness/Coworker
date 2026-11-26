import { AUDIT_PAGES } from "./settings-audit.ts";
import { CONNECTOR_PAGES } from "./settings-connectors.ts";
import { MCP_PAGES } from "./settings-mcp.ts";
import { MONEY_PAGES } from "./settings-money.ts";
import { PEOPLE_PAGES } from "./settings-people.ts";
import { SHARED } from "./settings-shared.ts";
import type { Fixture } from "./read.ts";

/** Every page of Settings. */
export const SETTINGS: readonly Fixture[] = [...PEOPLE_PAGES, ...MONEY_PAGES, ...AUDIT_PAGES, ...CONNECTOR_PAGES, ...MCP_PAGES, ...SHARED];

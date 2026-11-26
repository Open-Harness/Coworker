import type { SettingsPage } from "./types.ts";
import Agents from "./pages/agents.tsx";
import Environments from "./pages/environments.tsx";
import AuditLog from "./pages/audit-log.tsx";
import ConnectGithub from "./pages/connect-github.tsx";
import Connectors from "./pages/connectors.tsx";
import Billing from "./pages/billing.tsx";
import General from "./pages/general.tsx";
import Keys from "./pages/keys.tsx";
import McpServers from "./pages/mcp-servers.tsx";
import Members from "./pages/members.tsx";
import Skills from "./pages/skills.tsx";
import Notifications from "./pages/notifications.tsx";
import Profile from "./pages/profile.tsx";
import Security from "./pages/security.tsx";
import Templates from "./pages/templates.tsx";
import Usage from "./pages/usage.tsx";

/** What draws each page of Settings, by the name the list gives it. */
export const PAGES: Readonly<Record<string, SettingsPage | undefined>> = {
  General: { Body: General, save: true },
  Members: { Body: Members, fills: true },
  Keys: { Body: Keys, save: true },
  Usage: { Body: Usage },
  "Audit log": { Body: AuditLog, fills: true },
  Billing: { Body: Billing },
  "MCP servers": { Body: McpServers, save: true },
  Agents: { Body: Agents, save: true },
  Environments: { Body: Environments, save: true },
  Skills: { Body: Skills },
  Templates: { Body: Templates },
  Profile: { Body: Profile, save: true },
  Notifications: { Body: Notifications, save: true },
  Security: { Body: Security },
  Connectors: { Body: Connectors },
  "Connect GitHub": { Body: ConnectGithub },
};

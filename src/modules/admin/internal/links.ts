export const adminLinks = {
  overview: "/admin",
  create: "/admin/create",
  agents: "/admin/agents",
  blank: "/admin/agents/new",
  sessions: "/admin/sessions",
  deployments: "/admin/deployments",
  agent: (id: string) => `/admin/agents/${id}`,
  template: (key: string) => `/admin/agents/new?template=${key}`,
} as const;

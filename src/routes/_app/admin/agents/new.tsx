import { createFileRoute, useLocation } from "@tanstack/react-router";
import { NewAgentScreen } from "~/modules/admin/service.ts";

interface Search {
  readonly template?: string;
}

function NewAgent() {
  const { template } = Route.useSearch();
  // A drafted config travels in the history entry, so it survives a reload and is gone with the tab.
  const { draft } = useLocation().state as { readonly draft?: unknown };
  return <NewAgentScreen {...(template === undefined ? {} : { template })} draft={draft} />;
}

export const Route = createFileRoute("/_app/admin/agents/new")({
  validateSearch: (search: Record<string, unknown>): Search => (typeof search.template === "string" ? { template: search.template } : {}),
  component: NewAgent,
});

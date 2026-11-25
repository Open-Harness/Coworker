import { createFileRoute } from "@tanstack/react-router";
import { AgentsScreen } from "~/modules/admin/service.ts";

export const Route = createFileRoute("/_app/admin/agents/")({ component: AgentsScreen });

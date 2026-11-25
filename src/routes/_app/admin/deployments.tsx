import { createFileRoute } from "@tanstack/react-router";
import { DeploymentsScreen } from "~/modules/admin/service.ts";

export const Route = createFileRoute("/_app/admin/deployments")({ component: DeploymentsScreen });

import { createFileRoute } from "@tanstack/react-router";
import { OverviewScreen } from "~/modules/admin/service.ts";

export const Route = createFileRoute("/_app/admin/")({ component: OverviewScreen });

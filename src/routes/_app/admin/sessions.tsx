import { createFileRoute } from "@tanstack/react-router";
import { SessionsScreen } from "~/modules/admin/service.ts";

export const Route = createFileRoute("/_app/admin/sessions")({ component: SessionsScreen });

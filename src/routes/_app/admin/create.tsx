import { createFileRoute } from "@tanstack/react-router";
import { CreateScreen } from "~/modules/admin/service.ts";

export const Route = createFileRoute("/_app/admin/create")({ component: CreateScreen });

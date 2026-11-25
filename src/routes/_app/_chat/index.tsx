import { createFileRoute } from "@tanstack/react-router";
import { Landing } from "~/modules/app/service.ts";

export const Route = createFileRoute("/_app/_chat/")({ component: () => <Landing /> });

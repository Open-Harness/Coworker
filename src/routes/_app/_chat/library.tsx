import { createFileRoute } from "@tanstack/react-router";
import { LibraryScreen } from "~/modules/app/service.ts";

export const Route = createFileRoute("/_app/_chat/library")({ component: LibraryScreen });

import { createFileRoute } from "@tanstack/react-router";
import { EmailProofPage } from "~/modules/team-join/service.ts";

function ProveEmail() {
  return <EmailProofPage token={Route.useSearch().token} />;
}

export const Route = createFileRoute("/_team/join/email")({
  component: ProveEmail,
  validateSearch: (search: Readonly<Record<string, unknown>>) => ({ token: typeof search["token"] === "string" ? search["token"] : "" }),
});

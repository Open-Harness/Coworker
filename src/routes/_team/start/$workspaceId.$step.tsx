import { useMemo } from "react";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useServer } from "~/modules/team-core/service.ts";
import { createStartApi, isStep, StartPage } from "~/modules/team-start/service.ts";

const words = (value: unknown): string | undefined => (typeof value === "string" && value !== "" ? value : undefined);

function Step() {
  const { workspaceId, step } = Route.useParams();
  const { manager, template, only } = Route.useSearch();
  const server = useServer();
  const router = useRouter();
  const api = useMemo(() => createStartApi(server), [server]);
  return isStep(step) ? (
    <StartPage
      api={api}
      workspaceId={workspaceId}
      step={step}
      managerId={manager}
      template={template}
      only={only === 1}
      onGo={(address) => router.history.push(address)}
    />
  ) : null;
}

export const Route = createFileRoute("/_team/start/$workspaceId/$step")({
  component: Step,
  beforeLoad: ({ params }) => {
    if (!isStep(params.step)) throw redirect({ to: "/ws" });
  },
  validateSearch: (search: Readonly<Record<string, unknown>>) => ({
    manager: words(search["manager"]),
    template: words(search["template"]),
    only: search["only"] === 1 || search["only"] === "1" ? (1 as const) : undefined,
  }),
});

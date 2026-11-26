import { useMemo } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServer } from "~/modules/team-core/service.ts";
import { createStartApi, GitHubInstalledPage } from "~/modules/team-start/service.ts";

function Installed() {
  const { installation_id: installationId, code, state } = Route.useSearch();
  const server = useServer();
  const router = useRouter();
  return (
    <GitHubInstalledPage
      api={useMemo(() => createStartApi(server), [server])}
      state={state}
      code={code}
      installationId={installationId}
      onGo={(address) => router.history.push(address)}
    />
  );
}

/** The App's callback address: GitHub adds `installation_id` and `code`, and gives back the `state` its page was opened with. */
export const Route = createFileRoute("/_team/github/installed")({
  component: Installed,
  validateSearch: (search: Readonly<Record<string, unknown>>) => {
    const id = Number(search["installation_id"]);
    return {
      installation_id: Number.isSafeInteger(id) && id > 0 ? id : undefined,
      code: typeof search["code"] === "string" ? search["code"] : "",
      state: typeof search["state"] === "string" ? search["state"] : "",
    };
  },
});

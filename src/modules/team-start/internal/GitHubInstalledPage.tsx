import { useCallback, useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Load, teamLinks, useLoading } from "~/modules/team-core/service.ts";
import { Door } from "~/modules/team-join/service.ts";
import type { GitHubInstalledPageProps } from "../types.ts";

/**
 * Where GitHub sends an Owner back after installing the App. Nothing is connected until they say so here: a link with
 * someone else's installation in it would otherwise connect by being opened.
 */
export function GitHubInstalledPage({ api, state, code, installationId, onGo }: GitHubInstalledPageProps) {
  const [workspaceId = "", managerId = ""] = state.split("~");
  const { loaded } = useLoading(useCallback(() => api.workspaceName(workspaceId), [api, workspaceId]));
  const [failure, setFailure] = useState<string>();
  const back = managerId === "" ? teamLinks.settings(workspaceId, "keys") : teamLinks.step(workspaceId, "listen", { managerId });
  if (installationId === undefined || workspaceId === "" || code === "")
    return (
      <Door title="Nothing to connect" description="GitHub did not say which installation this is. Start again from Keys and connections.">
        <Button label="Your workspaces" variant="primary" size="lg" width="100%" href={teamLinks.home} />
      </Door>
    );
  const connect = async () => {
    const done = await api.settings.connectGitHub(workspaceId, { installationId, code, state });
    if (done._tag === "Loaded") onGo(back);
    else setFailure(done.message === "Taken" ? "Another workspace has connected that installation." : done.message);
  };
  return (
    <Load loaded={loaded} failedTitle="The workspace did not load">
      {(name) => (
        <Door
          title={`Connect GitHub to ${name}`}
          description={`The GitHub App is installed. Connecting it lets ${name}'s managers hear the repos you gave it.`}
          failure={failure === undefined ? undefined : { title: "GitHub was not connected", description: failure }}
        >
          <Button label="Connect" variant="primary" size="lg" width="100%" clickAction={connect} />
        </Door>
      )}
    </Load>
  );
}

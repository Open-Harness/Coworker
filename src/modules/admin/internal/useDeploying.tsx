import { useState } from "react";
import { useToast } from "@astryxdesign/core/Toast";
import { useDirectory, useReport, useSession } from "~/modules/app/service.ts";
import type { AgentRow } from "~/modules/agent-config/types.ts";
import { DeployDialog } from "./DeployDialog.tsx";

/** Deploying from any screen: `ask` opens the dialog, `element` is the dialog. */
export function useDeploying() {
  const { directory } = useSession();
  const { workspaces } = useDirectory();
  const report = useReport();
  const showToast = useToast();
  const [agent, setAgent] = useState<AgentRow>();
  const element = (
    <DeployDialog
      agent={agent}
      workspaces={workspaces.filter(({ archivedAt }) => archivedAt === undefined)}
      onClose={() => setAgent(undefined)}
      onDeploy={(version, to) => {
        if (agent === undefined) return;
        setAgent(undefined);
        void directory.deployAgent(agent.id, version, to).then((answer) => {
          if (answer.ok) showToast({ body: `${agent.config.name} v${version} is deployed`, uniqueID: "deployed" });
          else void report(Promise.resolve(answer));
        });
      }}
    />
  );
  return { ask: setAgent, element };
}

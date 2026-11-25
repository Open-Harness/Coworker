import { useCallback } from "react";
import { Load, teamLinks, useLoading } from "~/modules/team-core/service.ts";
import type { StartStep } from "~/modules/team-core/types.ts";
import type { Frame, ManagerAt, NextOptions, StartPageProps } from "../types.ts";
import { ConnectModel } from "./ConnectModel.tsx";
import { InviteTeam } from "./InviteTeam.tsx";
import { Listen } from "./Listen.tsx";
import { Mission } from "./Mission.tsx";
import { PickManager } from "./PickManager.tsx";

/** In order. Making the workspace comes before them, at `/start`. */
const ORDER: readonly StartStep[] = ["model", "manager", "mission", "listen", "invite"];

export const isStep = (value: string): value is StartStep => ORDER.some((step) => step === value);

/** A step opened from Getting started ends back in the workspace, except that picking a manager leads to its mission. */
function after(props: StartPageProps, done: NextOptions): string {
  const { workspaceId, step, only } = props;
  const managerId = done.managerId ?? props.managerId;
  const isLast = step === "invite" || (only && step !== "manager");
  if (isLast) return managerId === undefined ? teamLinks.inbox(workspaceId) : teamLinks.chat(workspaceId, managerId);
  const following = ORDER[ORDER.indexOf(step) + 1] ?? "invite";
  return teamLinks.step(workspaceId, following, { managerId, template: done.template, only });
}

function Steps({ name, managers, ...asked }: StartPageProps & { readonly name: string; readonly managers: readonly ManagerAt[] }) {
  const { api, workspaceId, only, managerId, template, onGo } = asked;
  const manager = managers.find((entry) => entry.managerId === managerId) ?? managers[0];
  // Nobody listens until there is a manager.
  const step = asked.step === "listen" && manager === undefined ? "manager" : asked.step;
  const frame: Frame = {
    workspace: name,
    step: only ? undefined : ORDER.indexOf(step) + 1,
    leave: only ? { label: `Back to ${name}`, href: teamLinks.inbox(workspaceId) } : undefined,
  };
  const common = { api, workspaceId, frame, next: (done: NextOptions) => onGo(after({ ...asked, step }, done)) };
  switch (step) {
    case "model":
      return <ConnectModel {...common} />;
    case "manager":
      return <PickManager {...common} />;
    case "mission":
      return <Mission {...common} template={template} />;
    case "listen":
      return manager === undefined ? null : <Listen key={manager.managerId} {...common} manager={manager} />;
    default:
      return <InviteTeam {...common} managerId={manager?.managerId} />;
  }
}

/** One step of setting up a workspace that exists. */
export function StartPage(props: StartPageProps) {
  const { api, workspaceId, step } = props;
  const { loaded: name } = useLoading(useCallback(() => api.workspaceName(workspaceId), [api, workspaceId]));
  // Read again at each step: the step before may have made one.
  const { loaded: managers } = useLoading(
    useCallback(
      () => (step === "model" ? Promise.resolve({ _tag: "Loaded" as const, value: [] }) : api.managers(workspaceId)),
      [api, workspaceId, step],
    ),
  );
  return (
    <Load loaded={name} failedTitle="The workspace did not load">
      {(called) => (
        <Load loaded={managers} failedTitle="Its managers did not load">
          {(list) => <Steps key={step} {...props} name={called} managers={list} />}
        </Load>
      )}
    </Load>
  );
}

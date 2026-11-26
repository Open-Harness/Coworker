import { useRef } from "react";
import { createFileRoute, useBlocker } from "@tanstack/react-router";
import { LeaveDialog, SettingsPages } from "~/modules/team-settings/service.ts";

function Settings() {
  const { workspaceId, page } = Route.useParams();
  const router = Route.useNavigate();
  const isDirty = useRef(false);
  // Leaving a form that holds changes nobody saved asks first, by link, by back button, and by closing the tab.
  const blocker = useBlocker({ shouldBlockFn: () => isDirty.current, enableBeforeUnload: () => isDirty.current, withResolver: true });
  return (
    <>
      <SettingsPages
        workspaceId={workspaceId}
        page={page}
        onDirty={(dirty) => void (isDirty.current = dirty)}
        onGone={() => {
          isDirty.current = false;
          void router({ to: "/ws" });
        }}
      />
      <LeaveDialog isOpen={blocker.status === "blocked"} onStay={() => blocker.reset?.()} onLeave={() => blocker.proceed?.()} />
    </>
  );
}

export const Route = createFileRoute("/_team/ws/$workspaceId/settings/$page")({ component: Settings });

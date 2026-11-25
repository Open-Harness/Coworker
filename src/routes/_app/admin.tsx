import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";
import { AdminShell } from "~/modules/admin/service.ts";

function Admin() {
  const { pathname } = useLocation();
  return (
    <AdminShell path={pathname}>
      <Outlet />
    </AdminShell>
  );
}

/** What administrators see: agents, where they are deployed, and every session. */
export const Route = createFileRoute("/_app/admin")({ component: Admin });

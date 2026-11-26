import { useMemo } from "react";
import { useRead } from "~/modules/page/service.ts";

/** `12 Nov`, in the workspace's time zone. */
export function useDay(): (at: number) => string {
  const shell = useRead("/shell");
  const zone = shell._tag === "Ok" ? shell.value.workspace.zone : "UTC";
  return useMemo(() => {
    const format = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: zone });
    return (at: number) => format.format(at);
  }, [zone]);
}

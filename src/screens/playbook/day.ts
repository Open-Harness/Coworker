import { useRead } from "~/modules/page/service.ts";

/** A day as a date, always: "23 Nov", even when it was two days ago. The time of the day in the workspace's zone. */
export function useDay(): { readonly day: (at: number) => string; readonly time: (at: number) => string; readonly zone: string } {
  const shell = useRead("/shell");
  const zone = shell._tag === "Ok" ? shell.value.workspace.zone : "UTC";
  const [date, clock] = [
    new Intl.DateTimeFormat("en-GB", { timeZone: zone, day: "numeric", month: "short" }),
    new Intl.DateTimeFormat("en-GB", { timeZone: zone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }),
  ];
  return { day: (at) => date.format(at), time: (at) => clock.format(at), zone };
}

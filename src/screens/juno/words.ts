import { useMemo } from "react";
import { useClock, useRead } from "~/modules/page/service.ts";
import type { Clock } from "~/modules/page/types.ts";
import type { Trigger } from "~/modules/playbook/types.ts";

const DAY = 86_400_000;
const NONE: readonly never[] = [];
const DAYS = ["Sundays", "Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays"] as const;

/** How a time is said, in the workspace's zone: pure, so it can be tested without a page. */
export interface Words {
  /** `14 Sep`. */
  readonly date: (at: number) => string;
  /** `Today, 09:52`, `Yesterday, 11:02`, `24 Nov, 09:20`. */
  readonly when: (at: number) => string;
  /** What is coming: `10:00`, `Tomorrow, 08:30`, `Mon, 07:00`. */
  readonly ahead: (at: number) => string;
}

const dayOf = (at: number, zone: string): number => {
  const [year = 0, month = 0, day = 0] = new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  })
    .format(at)
    .split("-")
    .map(Number);
  return Date.UTC(year, month - 1, day) / DAY;
};

export function createWords(clock: Clock, zone: string): Words {
  const date = (at: number): string => {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: zone, day: "numeric", month: "short" }).formatToParts(at);
    const pick = (type: string): string => parts.find((part) => part.type === type)?.value ?? "";
    return `${pick("day")} ${pick("month")}`;
  };
  const apart = (at: number): number => dayOf(at, zone) - dayOf(clock.now(), zone);
  return {
    date,
    when(at) {
      const ago = -apart(at);
      return `${ago === 0 ? "Today" : ago === 1 ? "Yesterday" : date(at)}, ${clock.time(at)}`;
    },
    ahead(at) {
      const away = apart(at);
      if (away <= 0) return clock.time(at);
      if (away === 1) return `Tomorrow, ${clock.time(at)}`;
      const weekday = new Intl.DateTimeFormat("en-US", { timeZone: zone, weekday: "short" }).format(at);
      return `${away < 7 ? weekday : date(at)}, ${clock.time(at)}`;
    },
  };
}

/** What a cron expression says, for the few shapes a trigger has; any other is shown as it is written. */
export function cadence(cron: string): string {
  const [minute = "", hour = "", day = "", , weekday = ""] = cron.trim().split(/\s+/u);
  const every = /^\*\/(\d+)$/u.exec(minute)?.[1];
  if (every !== undefined && hour === "*") return `Every ${every} minutes`;
  if (!/^\d+$/u.test(minute) || !/^\d+$/u.test(hour)) return cron;
  const time = `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
  if (day === "1" && weekday === "*") return "First of the month";
  if (day !== "*") return cron;
  if (weekday === "*") return `Every day, ${time}`;
  if (weekday === "1-5") return `Weekdays, ${time}`;
  const name = /^[0-6]$/u.test(weekday) ? DAYS[Number(weekday)] : undefined;
  return name === undefined ? cron : `${name}, ${time}`;
}

/** `72h` is `72 hours`. */
export function lasting(duration: string): string {
  const [, count = "", unit = ""] = /^(\d+)([mhd])$/u.exec(duration) ?? [];
  const word = unit === "m" ? "minute" : unit === "h" ? "hour" : unit === "d" ? "day" : "";
  return word === "" ? duration : `${count} ${word}${count === "1" ? "" : "s"}`;
}

export const KIND = { cron: "Cron", event: "Event", wait: "Wait", asked: "Asked" } as const;

/** When something makes a trigger go, in words. */
export function triggerWhen(trigger: Trigger): string {
  if (trigger.by === "cron") return cadence(trigger.when.cron);
  if (trigger.by === "wait") return lasting(trigger.for);
  return trigger.by === "event" ? "As it happens" : "When asked";
}

/** Times in the workspace's zone, and a manager's name by its id, both read from the shell that is already there. */
export function useWords(): Words & {
  readonly manager: (id: string) => string;
  /** The id of the manager above this one, or null at the top. */
  readonly above: (id: string) => string | null;
  readonly clock: Clock;
} {
  const clock = useClock();
  const shell = useRead("/shell");
  const zone = shell._tag === "Ok" ? shell.value.workspace.zone : "UTC";
  const tree = shell._tag === "Ok" ? shell.value.tree : NONE;
  return useMemo(
    () => ({ ...createWords(clock, zone), clock, manager: (id: string) => tree.find((node) => node.id === id)?.name ?? id,
      above: (id: string) => tree.find((node) => node.id === id)?.above ?? null,
    }),
    [clock, zone, tree],
  );
}

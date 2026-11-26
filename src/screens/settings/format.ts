import type { Clock } from "~/modules/page/types.ts";

/** "Europe/Copenhagen" is said "Copenhagen". */
export const place = (zone: string): string => (zone.split("/").pop() ?? zone).replaceAll("_", " ");

/** `25 Nov`, in the workspace's zone. */
export const day = (at: number, zone: string): string =>
  new Intl.DateTimeFormat("en-GB", { timeZone: zone, day: "numeric", month: "short" }).format(at);

/** `25 Nov, 09:48`. */
export const dayAndTime = (at: number, zone: string, clock: Clock): string => `${day(at, zone)}, ${clock.time(at)}`;

const isTime = (short: string): boolean => /^\d\d:\d\d$/u.test(short);

/** `Today, 09:54`, `Yesterday, 16:12`, `24 Nov, 10:56`: for a line of a log. */
export function when(at: number, zone: string, clock: Clock): string {
  const short = clock.short(at);
  if (isTime(short)) return `Today, ${short}`;
  if (short === "Yesterday") return `Yesterday, ${clock.time(at)}`;
  return dayAndTime(at, zone, clock);
}

/** `Now` when it is this minute, `Today, 08:40`, `24 Nov`; `Not yet` when never. */
export function lastSeen(at: number | null, zone: string, clock: Clock): string {
  if (at === null) return "Not yet";
  if (clock.now() - at < 60_000) return "Now";
  const short = clock.short(at);
  if (isTime(short)) return `Today, ${short}`;
  return short === "Yesterday" ? `Yesterday, ${clock.time(at)}` : day(at, zone);
}

/** `$60.00` with cents, `$14` without. */
export const dollars = (amount: number, cents = false): string => `$${cents ? amount.toFixed(2) : String(amount)}`;

export const capital = (word: string): string => word.charAt(0).toUpperCase() + word.slice(1);

/** `41 s`, `1 min 4 s`, from milliseconds. */
export function took(ms: number): string {
  const seconds = Math.round(ms / 1000);
  return seconds < 60 ? `${seconds} s` : `${Math.floor(seconds / 60)} min ${seconds % 60} s`;
}

const CONNECTORS: Readonly<Record<string, string>> = {
  github: "GitHub",
  slack: "Slack",
  whatsapp: "WhatsApp",
  crm: "CRM",
  email: "Email",
  calendar: "Calendar",
};
/** What a connector is called, by its id. */
export const connectorName = (id: string): string => CONNECTORS[id] ?? capital(id);

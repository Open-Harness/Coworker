import type { ActionId, Grant, Permission } from "~/modules/reach/types.ts";
import type { Line, Trigger } from "~/modules/playbook/types.ts";
import type { PlaybookView } from "~/modules/views-manager/types.ts";

/* What the playbook's data is called in words: the parts, the names of lines, and how a cron, a limit or an action is said. */

export const PARTS = ["Playbook", "Objective", "Workflow", "Triggers", "Agents", "Skills", "Reach", "Evals"] as const;
export type Part = (typeof PARTS)[number];
export const slug = (part: string): string => part.toLowerCase().replaceAll(" ", "-");
export const upper = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);

export const money = (n: number): string => `$${Number.isInteger(n) ? n : n.toFixed(2)}`;
const pad = (n: number | string): string => String(n).padStart(2, "0");

const DAYS = ["Sundays", "Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays"];

/** `0 7 * * 1-5` is "Weekdays, 07:00". */
export function cronWords(cron: string): string {
  const [minute = "0", hour = "0", , , days = "*"] = cron.split(" ");
  const time = `${pad(hour)}:${pad(minute)}`;
  const on = days === "*" ? "Every day" : days === "1-5" ? "Weekdays" : /^\d$/u.test(days) ? (DAYS[Number(days) % 7] ?? days) : days;
  return `${on}, ${time}`;
}

/** The other way, for the words a person types: "Weekdays, 08:30". Undefined when it is not one of those. */
export function cronOf(words: string): string | undefined {
  const [on = "", time = ""] = words.split(", ");
  const [hour, minute] = time.split(":");
  if (hour === undefined || minute === undefined || Number.isNaN(Number(hour)) || Number.isNaN(Number(minute))) return undefined;
  const day = on === "Every day" ? "*" : on === "Weekdays" ? "1-5" : DAYS.indexOf(on);
  return day === -1 ? undefined : `${Number(minute)} ${Number(hour)} * * ${day}`;
}

const SPAN: Readonly<Record<string, string>> = { m: "minutes", h: "hours", d: "days" };
/** `72h` is "72 hours". */
export function spanWords(span: string): string {
  const [, n = "", unit = ""] = /^(\d+)([mhd])$/u.exec(span) ?? [];
  return n === "" ? span : `${n} ${SPAN[unit] ?? unit}`;
}

/** When a trigger goes off, as a person says it. */
export function whenWords(trigger: Trigger): string {
  if (trigger.by === "cron") return cronWords(trigger.when.cron);
  if (trigger.by === "event") return trigger.events.some((event) => event.includes("received")) ? "As it arrives" : "As it happens";
  if (trigger.by === "wait") return spanWords(trigger.for);
  return "When they ask";
}

const dayIn = (at: number, zone: string): number => {
  const [year = 0, month = 0, day = 0] = new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  })
    .format(at)
    .split("-")
    .map(Number);
  return Date.UTC(year, month - 1, day);
};

/** "Tomorrow, 08:30", "Mon, 06:00": a time that has not come yet. */
export function aheadWords(at: number, now: number, zone: string, time: string): string {
  const ahead = Math.round((dayIn(at, zone) - dayIn(now, zone)) / 86_400_000);
  if (ahead <= 0) return time;
  if (ahead === 1) return `Tomorrow, ${time}`;
  const day =
    ahead < 7
      ? new Intl.DateTimeFormat("en-GB", { timeZone: zone, weekday: "short" }).format(at)
      : new Intl.DateTimeFormat("en-GB", { timeZone: zone, day: "numeric", month: "short" }).format(at);
  return `${day}, ${time}`;
}

/** What each account is called on a table. */
export const ACCOUNT: Readonly<Record<string, string>> = {
  email: "Mail",
  crm: "CRM",
  calendar: "Calendar",
  web: "Web",
  slack: "Slack",
  github: "GitHub",
};
export const accountName = (account: string): string => ACCOUNT[account] ?? upper(account);

export const MODES = ["off", "watch", "ask", "do"] as const;
export type Mode = (typeof MODES)[number];
export const MODE: Readonly<Record<Mode, string>> = { off: "Off", watch: "Watch", ask: "Ask", do: "Do" };
export const MODE_DOES: Readonly<Record<Mode, string>> = {
  off: "It does not look at it.",
  watch: "It says what it would have done. Nothing starts.",
  ask: "It prepares it. A person says yes before anything goes out.",
  do: "It starts by itself.",
};

/** What each action is, said short. Not listed: it is part of another, or too small to say. */
const SAYS: Readonly<Record<ActionId, string>> = {
  "email.reply": "Reply in threads it has",
  "email.send_outside": "Write first to someone",
  "crm.read": "Read all",
  "crm.change_own": "Change its own deals",
  "crm.move_deal": "Move a deal",
  "calendar.move": "Move a call",
  "web.read": "Read pages",
};

const first = (text: string): string => upper(text);
/** What a grant lets it do by itself, and what it asks first, in the words of the Reach table. */
export function grantWords(grant: Grant, firstName: (id: string) => string): { readonly alone: string; readonly asks: string } {
  const of = (is: Permission): readonly string[] =>
    Object.entries(grant.may)
      .filter(([, p]) => p === is)
      .map(([action]) => action);
  const say = (action: ActionId): string => {
    if (action.endsWith(".read") && grant.account === "email") return `Read ${grant.place.split("@")[0]}@`;
    if (action === "calendar.read") return `Read ${firstName(grant.place)}’s free and busy`;
    if (action === "calendar.book") return "Book on the calendar";
    return SAYS[action] ?? "";
  };
  const join = (actions: readonly string[]): string =>
    actions
      .map(say)
      .filter((one) => one !== "")
      .map(first)
      .join(". ");
  const asks = join(of("ask"));
  return { alone: join(of("on")), asks: asks === "" ? "Nothing else" : asks };
}

/** What a base tool or an action is, for "May use". The base tools every agent has are not listed. */
const TOOL: Readonly<Record<string, string>> = { web_read: "Web", "crm.read": "CRM to read", "email.draft": "Mail, drafts only" };
export function toolWords(tools: readonly string[]): string {
  const said = tools.map((tool) => TOOL[tool]).filter((one): one is string => one !== undefined);
  return said.length === 0 ? "None" : said.join(", ");
}

/** What a line of the playbook is called, for a comment or a part. */
export function nameOfLine(view: PlaybookView, line: Line): string {
  const [head = "", a = "", b = ""] = line.split("/");
  const { playbook } = view;
  if (head === "workflow") {
    const kind = playbook.kinds.find((one) => one.id === a);
    return b === "" ? (kind?.name ?? a) : (kind?.steps.find((step) => step.id === b)?.name ?? b);
  }
  if (head === "triggers") return playbook.triggers.find((one) => one.id === a)?.name ?? a;
  if (head === "agents") return playbook.agents.find((one) => one.id === a)?.name ?? a;
  if (head === "skills") return view.skills.find((one) => one.id === a)?.name ?? a;
  if (head === "evals") {
    const of = view.evals.find((one) => one.eval.id === a)?.eval.of;
    return of === undefined ? a : of === "playbook" ? playbook.name : nameOfLine(view, of);
  }
  if (head === "reach") return accountName(a);
  if (head === "playbook") return playbook.name;
  return upper(head);
}

/** The kind of thing a line is, for the Evals table. */
export function kindOfLine(view: PlaybookView, line: Line): string {
  const [head = "", a = ""] = line.split("/");
  if (head === "playbook") return "Playbook";
  if (head === "workflow") return "Step";
  if (head === "agents") return "Agent";
  if (head === "skills") return "Skill";
  if (head === "triggers") return upper(view.playbook.triggers.find((one) => one.id === a)?.by ?? "trigger");
  return upper(head);
}

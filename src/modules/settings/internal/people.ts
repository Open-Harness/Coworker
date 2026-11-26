import type { By } from "~/modules/actions/types.ts";
import type { Invalid, NoticeEvent, NotificationView, ProfileView, Saved, SettingsApi, SettingsPlace, Weekday } from "../types.ts";
import { validZone } from "./general.ts";
import { isRecord, readPerson, writePerson } from "./store.ts";
import { said } from "./said.ts";

/*
 * What a person chooses for themselves in this workspace: their time zone, working hours and which of the workspace's
 * notices also reach them by email. The Inbox always has everything.
 */

const LANGUAGES: ReadonlySet<string> = new Set(["en", "de", "es", "fr", "it", "ja", "pt"]);
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/u;

export const EVENTS: readonly { readonly event: NoticeEvent; readonly label: string }[] = [
  { event: "question", label: "A question for you" },
  { event: "approval", label: "An ask: something waits for your yes or no" },
  { event: "notice", label: "Something the workspace tells you" },
];

const isWeekday = (value: unknown): value is Weekday => Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 6;

function hoursOf(value: unknown): ProfileView["workingHours"] {
  if (!isRecord(value) || !Array.isArray(value["days"])) return null;
  const [from, to, days] = [value["from"], value["to"], value["days"].filter(isWeekday)];
  return typeof from === "string" && typeof to === "string" && TIME.test(from) && TIME.test(to) && days.length > 0
    ? { days: [...new Set(days)].sort(), from, to }
    : null;
}

export function profileOf(place: SettingsPlace, person: string): ProfileView {
  const value = readPerson(place.sql, person, "profile");
  const language = isRecord(value) && typeof value["language"] === "string" && LANGUAGES.has(value["language"]) ? value["language"] : "en";
  return {
    timeZone: isRecord(value) && typeof value["timeZone"] === "string" ? value["timeZone"] : null,
    language,
    workingHours: isRecord(value) ? hoursOf(value["workingHours"]) : null,
  };
}

export function setProfile(place: SettingsPlace, input: Parameters<SettingsApi["setProfile"]>[0], by: By): Saved<ProfileView> | Invalid {
  const before = profileOf(place, input.person);
  const { timeZone, language, workingHours } = { ...before, ...input };
  if (timeZone !== null && !validZone(timeZone)) return { _tag: "Invalid", reason: `${timeZone} is not a time zone` };
  if (!LANGUAGES.has(language)) return { _tag: "Invalid", reason: `The language is one of ${[...LANGUAGES].join(", ")}` };
  if (input.workingHours !== undefined && input.workingHours !== null && hoursOf(input.workingHours) === null)
    return { _tag: "Invalid", reason: "Working hours are days 0 to 6 and HH:MM times" };
  const next: ProfileView = {
    timeZone,
    language,
    workingHours: input.workingHours === undefined ? before.workingHours : hoursOf(workingHours),
  };
  writePerson(place.sql, input.person, "profile", next);
  said(place, by, "settings.profile", `${by.name} changed their profile settings`);
  return { _tag: "Saved", value: next };
}

export function notificationsOf(place: SettingsPlace, person: string): NotificationView {
  const value = readPerson(place.sql, person, "notifications");
  const email = isRecord(value) && isRecord(value["email"]) ? value["email"] : {};
  return {
    events: EVENTS.map(({ event, label }) => ({ event, label, email: email[event] === true })),
    quietHours: isRecord(value) && value["quietHours"] === true,
  };
}

export function setNotifications(
  place: SettingsPlace,
  input: Parameters<SettingsApi["setNotifications"]>[0],
  by: By,
): Saved<NotificationView> | Invalid {
  const known: ReadonlySet<string> = new Set(EVENTS.map(({ event }) => event));
  for (const [event, on] of Object.entries(input.email ?? {})) {
    if (!known.has(event) || typeof on !== "boolean") return { _tag: "Invalid", reason: `${event} is not something that can be mailed` };
  }
  const before = notificationsOf(place, input.person);
  const email = Object.fromEntries(before.events.map(({ event, email: on }) => [event, input.email?.[event] ?? on]));
  const quietHours = input.quietHours ?? before.quietHours;
  writePerson(place.sql, input.person, "notifications", { email, quietHours });
  said(place, by, "settings.notifications", `${by.name} changed which notices reach them by email`);
  return { _tag: "Saved", value: notificationsOf(place, input.person) };
}

/** Whether `at` falls inside the person's working hours, in their own time zone. No hours set: always. */
export function working(profile: ProfileView, fallbackZone: string, at: number): boolean {
  const hours = profile.workingHours;
  if (hours === null) return true;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: profile.timeZone ?? fallbackZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(at);
  const part = (type: string): string => parts.find((p) => p.type === type)?.value ?? "";
  const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(part("weekday"));
  const now = `${part("hour")}:${part("minute")}`;
  return hours.days.includes(day as Weekday) && now >= hours.from && now < hours.to;
}

import type { Reads, Writes } from "~/modules/api/types.ts";

/** One answer of the API, as the app asks for it: `read("/m/:manager/board", { manager: "coding" }, …)`. */
export type Fixture = readonly [string, unknown];
type Parts = Readonly<Record<string, string>>;

const filled = (path: string, parts: Parts): string => {
  const [route = "", query = ""] = path.split("?");
  const asked = query.split("&").filter((name) => parts[name] !== undefined).map((name) => `${name}=${encodeURIComponent(parts[name] ?? "")}`);
  const at = route.replaceAll(/:(\w+)/gu, (_, name: string) => encodeURIComponent(parts[name] ?? ""));
  return asked.length === 0 ? at : `${at}?${asked.join("&")}`;
};
export const read = <P extends keyof Reads>(path: P, parts: Parts, value: Reads[P]): Fixture => [filled(path, parts), value];
export const write = <P extends keyof Writes>(path: P, parts: Parts, value: Writes[P]["answer"]): Fixture => [filled(path, parts), value];

/** Days and times of the story: `at("25 Nov 09:54")`, in Copenhagen, 2026 unless it says a year. */
export const at = (when: string): number => {
  const time = Date.parse(`${/\d{4}/u.test(when) ? when : when.replace(/^(\d+ \w+)/u, "$1 2026")} GMT+0${/ (?:Apr|May|Jun|Jul|Aug|Sep) /u.test(`${when} `) || /^(?:[1-9]|1\d|2[0-4]) Oct/u.test(when) ? 2 : 1}00`);
  if (Number.isNaN(time)) throw new Error(`Not a time: ${when}`);
  return time;
};

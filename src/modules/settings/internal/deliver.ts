import type { By } from "~/modules/actions/types.ts";
import type { SettingsApi, SettingsPlace } from "../types.ts";
import { viewOf } from "./general.ts";
import { notificationsOf, profileOf, working } from "./people.ts";

/**
 * Mails a person an Inbox item when they asked for that kind by email. Outside their working hours it waits for the
 * Inbox when they chose quiet hours. The caller sends each item here once. A failed send is not an error: the Inbox has it.
 */
export async function deliver(
  place: SettingsPlace,
  input: Parameters<SettingsApi["deliver"]>[0],
  _by: By,
): Promise<{ readonly _tag: "Offered" }> {
  const offered = { _tag: "Offered" } as const;
  const to = input.to.startsWith("email:") ? input.to.slice("email:".length) : undefined;
  if (to === undefined) return offered;
  const prefs = notificationsOf(place, input.to);
  if (prefs.events.find(({ event }) => event === input.kind)?.email !== true) return offered;
  if (prefs.quietHours && !working(profileOf(place, input.to), viewOf(place).timeZone, place.clock.now())) return offered;
  await place.mailer
    .send({
      from: place.sendFrom,
      fromName: "Co-worker",
      to,
      subject: input.title.slice(0, 120),
      text: `${input.title}\n\nFrom ${input.from} in ${place.profile.name}. Answer in your Inbox.`,
    })
    .catch(() => undefined);
  return offered;
}

import type { By } from "~/modules/actions/types.ts";
import type { SettingsApi, SettingsPlace } from "../types.ts";
import { said } from "./said.ts";

/** A mail from a manager's own address to the person who asked, to show the address works from here. */
export async function testMail(place: SettingsPlace, input: Parameters<SettingsApi["testMail"]>[0], by: By) {
  const entry = place.roster.find(({ managerId }) => managerId === input.managerId);
  if (entry === undefined) return { _tag: "NotFound" } as const;
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/u.test(input.to)) return { _tag: "Invalid", reason: "There is no address to send to" } as const;
  const sent = await place.mailer.send({
    from: entry.address,
    fromName: entry.name,
    to: input.to,
    subject: `A test from ${entry.name}`,
    text: `This is a test mail from ${entry.name} (${entry.address}) in ${place.profile.name}. If you can read it, mail from this manager reaches you.`,
  });
  if (sent._tag === "Failed") return { _tag: "Invalid", reason: `The mail was not sent: ${sent.reason}` } as const;
  said(place, by, "settings.email", `${by.name} sent a test mail from ${entry.address}`, entry.managerId);
  return { _tag: "Sent", from: entry.address } as const;
}

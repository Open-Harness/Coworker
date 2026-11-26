import type { Mailer } from "~/modules/mail/types.ts";
import type { AuthSettings, SignedIn } from "../types.ts";
import { sealed, unsealed } from "./signed.ts";

/* Proving another email address: a link mailed to it, naming the account and the address. */

export async function sendEmailProof(settings: AuthSettings, mailer: Mailer, user: SignedIn, email: string, now: number): Promise<void> {
  const address = email.trim().toLowerCase();
  const token = await sealed(settings.secret, "email-proof", user.userId, address, now);
  await mailer.send({
    from: settings.sendFrom,
    fromName: "Co-worker",
    to: address,
    subject: "Is this your address?",
    text: `${user.name} asked to add this address to their Co-worker account. If that is you: ${settings.baseUrl}/api/me/emails/verify?token=${token}\n\nThe link expires in an hour.`,
  });
}

/** The address the link proves, if it is good, unexpired, and for the person signed in now. */
export const emailProven = (settings: AuthSettings, user: SignedIn, token: string, now: number): Promise<string | undefined> =>
  unsealed(settings.secret, "email-proof", user.userId, token, now);

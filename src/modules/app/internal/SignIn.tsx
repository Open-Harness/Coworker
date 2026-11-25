import { useState } from "react";
import { NameDialog } from "~/modules/ui/service.ts";
import type { Account } from "../types.ts";

const MAX_EMAIL = 254;

/** Shown to someone not signed in: one field for an email address, then a link in their inbox. */
export function SignIn({ account, returnTo }: { readonly account: Account; readonly returnTo: string }) {
  const [sent, setSent] = useState<{ readonly email: string; readonly ok: boolean }>();
  const description =
    sent === undefined
      ? "We email you a link. Opening it signs you in."
      : sent.ok
        ? `We sent a link to ${sent.email}. Open it on this device to sign in.`
        : `We could not send a link to ${sent.email}. Check the address and try again.`;
  return (
    <NameDialog
      isOpen
      title="Sign in to Co-worker"
      description={description}
      label="Email"
      submitLabel={sent?.ok === true ? "Send again" : "Email me a link"}
      maxLength={MAX_EMAIL}
      onSubmit={(email) => void account.sendLink(email, returnTo).then((ok) => setSent({ email, ok }))}
    />
  );
}

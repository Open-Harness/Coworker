import { useCallback } from "react";
import { Button } from "@astryxdesign/core/Button";
import { teamLinks, useLoading, Waiting } from "~/modules/team-core/service.ts";
import type { EmailProofPageProps } from "../types.ts";
import { Door } from "./Door.tsx";
import { useSession } from "./context.ts";
import { SignInPage } from "./SignInPage.tsx";

function Proved({ token }: EmailProofPageProps) {
  const { api, who } = useSession();
  const { loaded } = useLoading(useCallback(() => api.proveEmail(token), [api, token]));
  if (loaded === undefined) return <Waiting />;
  return (
    <Door
      title={loaded._tag === "Loaded" ? "It's yours" : "That link is not good"}
      description={
        loaded._tag === "Loaded"
          ? `What you write from ${loaded.value} counts as you, in every workspace you are in.`
          : `It lasts an hour and only works for the account that asked. You're signed in as ${who?.email ?? ""}.`
      }
    >
      <Button label="Your workspaces" variant="primary" size="lg" width="100%" href={teamLinks.home} />
    </Door>
  );
}

/** Where the link that proves another address opens. */
export function EmailProofPage({ token }: EmailProofPageProps) {
  const { who } = useSession();
  return who === undefined ? (
    <SignInPage title="Is this your address?" description="Sign in to the account that asked to add it." />
  ) : (
    <Proved token={token} />
  );
}

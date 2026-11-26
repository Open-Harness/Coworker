import { useEffect, useState } from "react";
import { Waiting } from "~/modules/team-core/service.ts";
import type { SessionProps, Who } from "../types.ts";
import { SessionContext } from "./context.ts";
import { SignInPage } from "./SignInPage.tsx";

/** Finds out who is signed in, and shows the sign-in page to anyone who is not, except on open pages. */
export function Session({ api, isOpen, children }: SessionProps) {
  const [who, setWho] = useState<Who | null>();
  useEffect(() => {
    let isCurrent = true;
    void api.who().then((found) => isCurrent && setWho(found._tag === "Loaded" ? found.value : null));
    return () => {
      isCurrent = false;
    };
  }, [api]);
  if (who === undefined) return <Waiting />;
  const leave = async () => {
    const left = await api.signOut();
    if (left._tag === "Loaded") setWho(null);
  };
  return (
    <SessionContext value={{ api, who: who ?? undefined, leave }}>
      {who === null && !isOpen ? (
        <SignInPage title="Sign in or create an account" description="We email you a link. There is no password." />
      ) : (
        children
      )}
    </SessionContext>
  );
}

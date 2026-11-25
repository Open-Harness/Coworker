import { type ReactNode, useEffect, useState } from "react";
import { Center } from "@astryxdesign/core/Center";
import { Spinner } from "@astryxdesign/core/Spinner";
import { useToast } from "@astryxdesign/core/Toast";
import type { Person } from "~/modules/protocol/types.ts";
import type { AppDependencies, Session } from "../types.ts";
import { PageContext } from "./page-context.ts";
import { closeSession, createSession } from "./session.ts";
import { SignIn } from "./SignIn.tsx";

const Loading = () => (
  <Center minHeight="100dvh">
    <Spinner size="lg" />
  </Center>
);

/** Finds out who is signed in, asking them to sign in when nobody is, then connects. */
export function SessionGate({ dependencies, children }: { readonly dependencies: AppDependencies; readonly children: ReactNode }) {
  const [me, setMe] = useState<Person | null>();
  const [session, setSession] = useState<Session>();
  const showToast = useToast();
  useEffect(() => {
    let isCurrent = true;
    void dependencies.account.me().then((person) => isCurrent && setMe(person ?? null));
    return () => {
      isCurrent = false;
    };
  }, [dependencies]);
  useEffect(() => {
    if (me === undefined || me === null) return;
    const onError = (body: string) => showToast({ body, type: "error", uniqueID: body });
    const opened = createSession(me, dependencies, onError);
    setSession(opened);
    return () => closeSession(opened);
  }, [me, dependencies, showToast]);
  if (me === null) return <SignIn account={dependencies.account} returnTo={dependencies.here()} />;
  return session === undefined ? <Loading /> : <PageContext value={{ session, dependencies }}>{children}</PageContext>;
}

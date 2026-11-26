import { useState } from "react";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Divider } from "@astryxdesign/core/Divider";
import { VStack } from "@astryxdesign/core/Layout";
import { TextInput } from "@astryxdesign/core/TextInput";
import { useBrowser, useLoading } from "~/modules/team-core/service.ts";
import type { SignInPageProps, Way } from "../types.ts";
import { Door } from "./Door.tsx";
import { useSession } from "./context.ts";
import { isEmail, withoutError } from "./words.ts";

const WAYS: Readonly<Record<Way, string>> = { google: "Continue with Google", github: "Continue with GitHub" };

/** Signing in, which is also how an account is made. The sign-in link comes back to the page that asked. */
export function SignInPage({ title, description, email: only }: SignInPageProps) {
  const { api } = useSession();
  const { here, goTo } = useBrowser();
  const { loaded: ways } = useLoading(api.ways);
  const [typed, setTyped] = useState("");
  const [sentTo, setSentTo] = useState<string>();
  const [problem, setProblem] = useState<string>();
  const back = withoutError(here());
  const email = only ?? typed.trim();
  const isReady = isEmail(email);
  const send = async () => {
    if (!isReady) return;
    const sent = await api.sendLink(email, back.path);
    setSentTo(sent._tag === "Loaded" ? email : undefined);
    setProblem(sent._tag === "Failed" ? `We could not send a link to ${email}. ${sent.message}` : undefined);
  };
  const continueWith = async (way: Way) => {
    const page = await api.signInWith(way, back.path);
    if (page._tag === "Loaded") goTo(page.value);
    else setProblem(page.message);
  };
  const failure =
    problem !== undefined
      ? { title: "That did not work", description: problem }
      : back.failed && sentTo === undefined
        ? { title: "That sign-in link is used or out of date", description: "A link works once, for 5 minutes. Send a new one." }
        : undefined;
  const others = ways?._tag === "Loaded" ? ways.value : [];
  return (
    <Door title={title} description={description} failure={failure}>
      {others.length > 0 && (
        <VStack gap={2}>
          {others.map((way) => (
            <Button key={way} label={WAYS[way]} size="lg" width="100%" clickAction={() => continueWith(way)} />
          ))}
        </VStack>
      )}
      {others.length > 0 && <Divider label="or" />}
      <VStack gap={3}>
        {sentTo !== undefined && (
          <Banner status="success" title={`We sent a link to ${sentTo}`} description="Open it in this browser to sign in." />
        )}
        <TextInput
          label="Email"
          type="email"
          placeholder="name@company.com"
          value={email}
          onChange={setTyped}
          onEnter={() => void send()}
          isReadOnly={only !== undefined}
          size="lg"
          width="100%"
        />
        <Button
          label={sentTo === undefined ? "Email me a link" : "Send it again"}
          variant={sentTo === undefined ? "primary" : "secondary"}
          size="lg"
          width="100%"
          isDisabled={!isReady}
          clickAction={send}
        />
      </VStack>
    </Door>
  );
}

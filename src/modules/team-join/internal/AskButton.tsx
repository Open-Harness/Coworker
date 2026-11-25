import { useState } from "react";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { useSession } from "./context.ts";

const SAID = {
  asked: { title: "Request sent", description: "It is in every Owner's Inbox. The workspace opens here once one lets you in." },
  waiting: { title: "Your request is waiting", description: "It is in every Owner's Inbox. Nobody has answered yet." },
  member: { title: "You are in already", description: "Open it from your workspaces." },
} as const;

/** Asks the workspace's Owners to let this person in. */
export function AskButton({ address, workspaceName }: { readonly address: string; readonly workspaceName: string }) {
  const { api } = useSession();
  const [answer, setAnswer] = useState<Awaited<ReturnType<typeof api.askToJoin>>>();
  if (answer?._tag === "Loaded") return <Banner status="success" {...SAID[answer.value]} />;
  return (
    <>
      {answer?._tag === "Failed" && <Banner status="error" title="The request was not sent" description={answer.message} />}
      <Button
        label={`Ask to join ${workspaceName}`}
        variant="primary"
        size="lg"
        width="100%"
        clickAction={async () => setAnswer(await api.askToJoin(address))}
      />
    </>
  );
}

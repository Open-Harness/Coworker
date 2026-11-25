import { useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { VStack } from "@astryxdesign/core/Layout";
import { Link } from "@astryxdesign/core/Link";
import { Text } from "@astryxdesign/core/Text";
import type { LinkPageProps } from "../types.ts";
import { AccountsPage } from "./AccountsPage.tsx";
import { Door } from "./Door.tsx";
import { useSession } from "./context.ts";
import { SignInPage } from "./SignInPage.tsx";

/** Where a shared invite link opens, signed in or not. Which workspace it is for is only told by joining. */
export function LinkPage({ workspaceId, secret }: LinkPageProps) {
  const { api, who, leave } = useSession();
  const [joined, setJoined] = useState<string>();
  const [failure, setFailure] = useState<string>();
  if (joined !== undefined) return <AccountsPage workspaceId={joined} />;
  if (who === undefined)
    return <SignInPage title="Join a workspace on Co-worker" description="Anyone with this link joins as a Member. Sign in first." />;
  const join = async () => {
    const result = await api.joinByLink(workspaceId, secret);
    if (result._tag === "Loaded") setJoined(result.value);
    setFailure(
      result._tag === "Failed"
        ? "The link is not good any more. An Owner can turn links off or make a new one; ask for it again."
        : undefined,
    );
  };
  return (
    <Door
      title="Join the workspace"
      description="Anyone with this link joins as a Member. Members answer managers, add work and chat with them."
      failure={failure === undefined ? undefined : { title: "You could not join", description: failure }}
    >
      <VStack gap={3}>
        <Button label="Join" variant="primary" size="lg" width="100%" clickAction={join} />
        <Text type="supporting">
          {`Signed in as ${who.email}. `}
          <Link type="supporting" hasUnderline onClick={() => void leave()}>
            Not you?
          </Link>
        </Text>
      </VStack>
    </Door>
  );
}

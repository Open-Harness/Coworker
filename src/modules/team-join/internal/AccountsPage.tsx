import { useState } from "react";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Layout";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Text } from "@astryxdesign/core/Text";
import { teamLinks, useBrowser, useLoading } from "~/modules/team-core/service.ts";
import type { AccountsPageProps, Way } from "../types.ts";
import { Door } from "./Door.tsx";
import { useSession } from "./context.ts";
import { isEmail } from "./words.ts";

const WAYS: Readonly<Record<Way, string>> = { google: "Google", github: "GitHub" };

/** Just joined: the other accounts a person writes from, so what they say there counts as theirs. */
export function AccountsPage({ workspaceId }: AccountsPageProps) {
  const { api, who } = useSession();
  const { goTo } = useBrowser();
  const { loaded: ways } = useLoading(api.ways);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState<readonly string[]>([]);
  const [failure, setFailure] = useState<string>();
  const address = email.trim();
  const add = async () => {
    const result = await api.addEmail(address);
    setFailure(result._tag === "Failed" ? result.message : undefined);
    if (result._tag === "Failed") return;
    setSent((all) => [...all, address]);
    setEmail("");
  };
  const connect = async (way: Way) => {
    const page = await api.linkAccount(way, teamLinks.inbox(workspaceId));
    if (page._tag === "Loaded") goTo(page.value);
    else setFailure(page.message);
  };
  return (
    <Door
      title="So managers know it's you"
      description={`You're in. Managers know you as ${who?.email ?? ""}. Add where else you write from, and it counts as you.`}
      failure={failure === undefined ? undefined : { title: "That did not work", description: failure }}
    >
      <VStack gap={4}>
        {ways?._tag === "Loaded" &&
          ways.value.map((way) => (
            <HStack key={way} gap={2} vAlign="center">
              <StackItem size="fill">
                <Text weight="medium">{WAYS[way]}</Text>
              </StackItem>
              <Button label={`Connect ${WAYS[way]}`} clickAction={() => connect(way)} />
            </HStack>
          ))}
        <HStack gap={2} vAlign="end">
          <StackItem size="fill">
            <TextInput
              label="Another email address"
              type="email"
              placeholder="you@home.com"
              value={email}
              onChange={setEmail}
              width="100%"
            />
          </StackItem>
          <Button label="Add" isDisabled={!isEmail(address)} clickAction={add} />
        </HStack>
        {sent.map((to) => (
          <Banner key={to} status="info" title={`We sent a link to ${to}`} description="Opening it adds the address. It lasts an hour." />
        ))}
      </VStack>
      <Button
        label={sent.length === 0 ? "Skip for now" : "Continue"}
        variant="primary"
        size="lg"
        width="100%"
        href={teamLinks.inbox(workspaceId)}
      />
    </Door>
  );
}

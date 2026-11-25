import { useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { FormLayout } from "@astryxdesign/core/FormLayout";
import { HStack, VStack } from "@astryxdesign/core/Layout";
import { RadioList, RadioListItem } from "@astryxdesign/core/RadioList";
import { Switch } from "@astryxdesign/core/Switch";
import { Heading, Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { teamLinks } from "~/modules/team-core/service.ts";
import { AskButton, useMe } from "~/modules/team-join/service.ts";
import type { CreateWorkspacePageProps } from "../types.ts";
import { addressFrom, workDomain } from "./words.ts";
import { Wizard } from "./Wizard.tsx";

/** For someone whose company is here already. */
function AskInstead({ address: given }: { readonly address: string }) {
  const [typed, setTyped] = useState("");
  const address = given === "" ? typed.trim().toLowerCase() : given;
  return (
    <Card padding={5} variant="muted">
      <VStack gap={4}>
        <VStack gap={0}>
          <Heading level={2}>{given === "" ? "Your team is here already?" : `${given} is taken`}</Heading>
          <Text type="supporting">
            {given === ""
              ? "Ask to join its workspace. An Owner has to let you in."
              : "If it is your company's, ask to join it: an Owner has to let you in. Otherwise pick another address."}
          </Text>
        </VStack>
        {given === "" && <TextInput label="Its address" placeholder="acme" value={typed} onChange={setTyped} width="100%" />}
        {address !== "" && <AskButton key={address} address={address} workspaceName={address} />}
      </VStack>
    </Card>
  );
}

/** The first step: a workspace's name, its address, who from work may join, and where its data lives. */
export function CreateWorkspacePage({ api, onGo, hasOthers }: CreateWorkspacePageProps) {
  const { email } = useMe();
  const domain = workDomain(email);
  const [name, setName] = useState("");
  const [typed, setTyped] = useState<string>();
  const [isOpen, setIsOpen] = useState(false);
  const [region, setRegion] = useState<"eu" | "us">("eu");
  const [taken, setTaken] = useState<string>();
  const [failure, setFailure] = useState<string>();
  const address = typed ?? addressFrom(name);
  const create = async () => {
    const made = await api.createWorkspace({ name: name.trim(), address, region });
    setTaken(made.kind === "taken" ? address : undefined);
    setFailure(made.kind === "failed" ? made.message : undefined);
    if (made.kind !== "made") return;
    if (isOpen && domain !== undefined) await api.settings.setDomains(made.workspaceId, [domain]);
    onGo(teamLinks.step(made.workspaceId, "model"));
  };
  return (
    <Wizard
      frame={{ step: 0, leave: hasOthers ? { label: "Your workspaces", href: teamLinks.home } : undefined }}
      title="Create your workspace"
      description="A workspace holds your managers, agents, keys and people."
      failure={failure === undefined ? undefined : { title: "The workspace was not made", description: failure }}
      action={<Button label="Create workspace" variant="primary" isDisabled={name.trim() === "" || address === ""} clickAction={create} />}
    >
      <FormLayout>
        <TextInput label="Name" placeholder="Acme" value={name} onChange={setName} hasAutoFocus width="100%" />
        <TextInput
          label="Address"
          description={`Managers get email addresses that end in .${address === "" ? "acme" : address}@co-worker.tech.`}
          value={address}
          onChange={(value) => setTyped(value.toLowerCase())}
          width="100%"
        />
        {taken !== undefined && taken === address && <AskInstead address={taken} />}
        {domain !== undefined && (
          <Switch
            label={`Anyone at ${domain} can join`}
            description="A new account with a verified address there joins as a Member straight away."
            value={isOpen}
            onChange={setIsOpen}
          />
        )}
        <RadioList
          label="Where should data live?"
          description="It cannot be moved later."
          value={region}
          onChange={(value) => setRegion(value === "us" ? "us" : "eu")}
          orientation="horizontal"
        >
          <RadioListItem value="eu" label="European Union" />
          <RadioListItem value="us" label="United States" />
        </RadioList>
      </FormLayout>
      {taken === undefined && (
        <HStack>
          <AskToggle />
        </HStack>
      )}
    </Wizard>
  );
}

function AskToggle() {
  const [isAsking, setIsAsking] = useState(false);
  if (isAsking) return <AskInstead address="" />;
  return <Button label="Ask to join a workspace instead" onClick={() => setIsAsking(true)} />;
}

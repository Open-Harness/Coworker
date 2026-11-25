import { useCallback, useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { CodeBlock } from "@astryxdesign/core/CodeBlock";
import { FormLayout } from "@astryxdesign/core/FormLayout";
import { HStack, VStack } from "@astryxdesign/core/Layout";
import { Selector } from "@astryxdesign/core/Selector";
import { Text } from "@astryxdesign/core/Text";
import { TextArea } from "@astryxdesign/core/TextArea";
import { Load, useLoading } from "~/modules/team-core/service.ts";
import { isRole, ROLES } from "~/modules/team-settings/service.ts";
import type { JoiningData, Role } from "~/modules/team-settings/types.ts";
import type { StepProps } from "../types.ts";
import { emailsIn } from "./words.ts";
import { Wizard } from "./Wizard.tsx";

function ShareLink({
  joining,
  origin,
  onMake,
}: {
  readonly joining: JoiningData;
  readonly origin: string;
  readonly onMake: () => Promise<void>;
}) {
  return (
    <VStack gap={2}>
      <VStack gap={0}>
        <Text type="label">Or share a link</Text>
        <Text type="supporting">Anyone with it joins as a Member. Owners can turn it off in Settings.</Text>
      </VStack>
      {joining.linksOn && joining.linkPath !== undefined ? (
        <CodeBlock code={`${origin}${joining.linkPath}`} hasLanguageLabel={false} size="sm" width="100%" isWrapped />
      ) : (
        <HStack>
          <Button label="Make a link" clickAction={onMake} />
        </HStack>
      )}
    </VStack>
  );
}

/** Who else works here. Skippable. */
export function InviteTeam({ api, workspaceId, frame, next, managerId }: StepProps & { readonly managerId: string | undefined }) {
  const { settings } = api;
  const { loaded, show } = useLoading(useCallback(() => settings.joining(workspaceId), [settings, workspaceId]));
  const [text, setText] = useState("");
  const [role, setRole] = useState<Role>("member");
  const [failure, setFailure] = useState<string>();
  const { emails, wrong } = emailsIn(text);
  const finish = () => next({ managerId });
  const send = async () => {
    const sent = await Promise.all(
      emails.map(async (email) => ({ email, result: await settings.invite(workspaceId, email, role, false) })),
    );
    const failed = sent.flatMap(({ email, result }) => (result._tag === "Failed" ? [{ email, message: result.message }] : []));
    setText(failed.map(({ email }) => email).join("\n"));
    setFailure(failed.length === 0 ? undefined : failed.map(({ email, message }) => `${email}: ${message}`).join(". "));
    if (failed.length === 0) finish();
  };
  const makeLink = async () => {
    const made = await settings.setLinks(workspaceId, true);
    if (made._tag === "Loaded") show(made.value);
    else setFailure(made.message);
  };
  return (
    <Wizard
      frame={frame}
      title="Who else works on this?"
      description="They can answer your managers' questions and add work."
      failure={failure === undefined ? undefined : { title: "Not everything was sent", description: failure }}
      action={
        <Button
          label={emails.length === 0 ? "Finish" : "Send invites and finish"}
          variant="primary"
          isDisabled={wrong.length > 0 || (emails.length === 0 && !(loaded?._tag === "Loaded" && loaded.value.linksOn))}
          clickAction={emails.length === 0 ? finish : send}
        />
      }
      skip={<Button label="Skip" variant="ghost" onClick={finish} />}
    >
      <FormLayout>
        <TextArea
          label="Emails"
          description="One per line, or with commas between."
          placeholder={"priya@acme.com\nmarco@acme.com"}
          rows={4}
          value={text}
          onChange={setText}
          width="100%"
          {...(wrong.length === 0 ? {} : { status: { type: "error" as const, message: `Not an email address: ${wrong.join(", ")}` } })}
        />
        <Selector
          label="Preset"
          description="What they may do. Owners can change it later."
          width="100%"
          options={ROLES.map(({ value, label, description }) => ({ value, label, description }))}
          value={role}
          onChange={(value) => isRole(value) && setRole(value)}
        />
        <Load loaded={loaded} failedTitle="The link did not load">
          {(joining) => <ShareLink joining={joining} origin={settings.origin} onMake={makeLink} />}
        </Load>
      </FormLayout>
    </Wizard>
  );
}

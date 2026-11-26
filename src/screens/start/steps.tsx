// astryx-template: form-wizard
import { useId, type ReactNode } from "react";
import { Badge } from "@astryxdesign/core/Badge";
import { Card } from "@astryxdesign/core/Card";
import { CheckboxList, CheckboxListItem } from "@astryxdesign/core/CheckboxList";
import { Divider } from "@astryxdesign/core/Divider";
import { Field } from "@astryxdesign/core/Field";
import { FormLayout } from "@astryxdesign/core/FormLayout";
import { Grid } from "@astryxdesign/core/Grid";
import { MetadataList, MetadataListItem } from "@astryxdesign/core/MetadataList";
import { NumberInput } from "@astryxdesign/core/NumberInput";
import { RadioList, RadioListItem } from "@astryxdesign/core/RadioList";
import { SelectableCard } from "@astryxdesign/core/SelectableCard";
import { Selector } from "@astryxdesign/core/Selector";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Switch } from "@astryxdesign/core/Switch";
import { Heading, Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { CONNECTORS, MODELS, REGIONS, type Answers } from "./answers.ts";

export interface Repo {
  readonly repo: string;
  readonly about: string;
}
interface Part {
  readonly answers: Answers;
  readonly set: (change: Partial<Answers>) => void;
  readonly errors: Readonly<Record<string, string>>;
}
const wrong = (message: string | undefined) => (message === undefined ? {} : { status: { type: "error" as const, message } });
const Head = ({ title, children }: { title: string; children: ReactNode }) => (
  <VStack gap={1}>
    <Heading level={2}>{title}</Heading>
    <Text type="supporting" color="secondary">
      {children}
    </Text>
  </VStack>
);

export function WorkspaceStep({ answers: a, set, errors }: Part) {
  return (
    <VStack gap={5}>
      <Head title="Workspace details">Name your workspace and pick where its data lives. The place cannot be changed later.</Head>
      <FormLayout defaultOptionality="optional">
        <TextInput
          label="Workspace name"
          isRequired
          value={a.name}
          onChange={(name: string) => set({ name })}
          placeholder="Acme"
          {...wrong(errors["name"])}
        />
        <TextInput
          label="Address"
          isRequired
          value={a.slug}
          onChange={(slug: string) => set({ slug })}
          placeholder="acme"
          description={`Juno gets mail at juno@${a.slug.trim() || "your-workspace"}.co-worker.tech`}
          {...wrong(errors["slug"])}
        />
        <Selector
          label="Where data lives"
          options={REGIONS}
          value={a.region}
          onChange={(region: string) => set({ region })}
          description="Work, files and the audit log are kept there."
        />
        <RadioList label="Who can join" value={a.join} onChange={(join: string) => set({ join })}>
          <RadioListItem value="invite" label="Invite only" description="People join only when an owner invites them." />
          <RadioListItem
            value="domain"
            label="Same domain"
            description="Anyone with a verified address at your mail domain can ask to join."
          />
        </RadioList>
      </FormLayout>
    </VStack>
  );
}

export function ModelStep({ answers: a, set, errors }: Part) {
  const id = useId();
  return (
    <VStack gap={5}>
      <Head title="What it thinks with">Bring your own. It is tested before you go on, and kept in the vault: managers never see it.</Head>
      <FormLayout defaultOptionality="optional">
        <Field label="Model" inputID={id} isGroupLabel>
          <Grid columns={{ minWidth: 200 }} gap={3}>
            {MODELS.map((m) => (
              <SelectableCard
                key={m.id}
                label={m.label}
                isSelected={a.model === m.id}
                onChange={() => set({ model: m.id, key: "" })}
                padding={4}
              >
                <VStack gap={2}>
                  <HStack gap={2} vAlign="center" hAlign="between">
                    <Text type="label">{m.label}</Text>
                    {m.id === "chatgpt" && <Badge variant="neutral" label="Quickest" />}
                  </HStack>
                  <Text type="large" weight="bold">
                    {m.price}
                  </Text>
                  <Text type="supporting" color="secondary">
                    {m.about}
                  </Text>
                </VStack>
              </SelectableCard>
            ))}
          </Grid>
        </Field>
        {a.model !== "chatgpt" && (
          <TextInput
            label={a.model === "key" ? "Key" : "Address"}
            isRequired
            type={a.model === "key" ? "password" : "text"}
            value={a.key}
            onChange={(key: string) => set({ key })}
            placeholder={a.model === "key" ? "Paste it here" : "https://models.acme.test/v1"}
            {...wrong(errors["key"])}
          />
        )}
        <NumberInput
          label="Most it may spend in a day, in dollars"
          value={a.limit}
          onChange={(limit: number) => set({ limit })}
          min={1}
          isIntegerOnly
          description="All managers together. Work waits when it is reached, and you are asked."
          {...wrong(errors["limit"])}
        />
      </FormLayout>
      <Card variant="muted" padding={5}>
        <HStack gap={3} vAlign="center" hAlign="between">
          <VStack gap={0.5}>
            <Text type="label">At most in a month</Text>
            <Text type="supporting" color="secondary">
              ${a.limit} a day, every day
            </Text>
          </VStack>
          <Text type="display-3">${(a.limit * 30).toLocaleString("en-US")}</Text>
        </HStack>
      </Card>
    </VStack>
  );
}

export function ConnectorStep({ answers: a, set, errors, repos }: Part & { readonly repos: readonly Repo[] }) {
  const id = useId();
  return (
    <VStack gap={5}>
      <Head title="Where work comes from">Connect one to start with. You can skip this and add connectors later.</Head>
      <FormLayout defaultOptionality="optional">
        <Field label="Connector" inputID={id} isGroupLabel>
          <Grid columns={{ minWidth: 200 }} gap={3}>
            {CONNECTORS.map((c) => (
              <SelectableCard
                key={c.id}
                label={c.label}
                isSelected={a.connector === c.id}
                onChange={() => set({ connector: c.id })}
                padding={4}
              >
                <VStack gap={2}>
                  <Text type="label">{c.label}</Text>
                  <Text type="supporting" color="secondary">
                    {c.about}
                  </Text>
                </VStack>
              </SelectableCard>
            ))}
          </Grid>
        </Field>
        {a.connector === "github" && (
          <CheckboxList
            label="Repos"
            description="You install the app on these, on GitHub."
            value={[...a.repos]}
            onChange={(repos: string[]) => set({ repos })}
            {...wrong(errors["repos"])}
          >
            {repos.map((one) => (
              <CheckboxListItem key={one.repo} value={one.repo} label={one.repo} description={one.about} />
            ))}
          </CheckboxList>
        )}
        <Divider />
        <Switch
          label="Tell me when the first work is done"
          description="One mail, with what came in and what went out."
          value={a.tellMe}
          onChange={(tellMe: boolean) => set({ tellMe })}
          labelPosition="start"
          labelSpacing="spread"
        />
      </FormLayout>
    </VStack>
  );
}

export function ReviewStep({ answers: a }: Part) {
  const connector = CONNECTORS.find((c) => c.id === a.connector);
  return (
    <VStack gap={5}>
      <Head title="Review and create">Nothing is made until you create the workspace. Use the steps above to go back.</Head>
      <MetadataList orientation="vertical">
        <MetadataListItem label="Workspace name">{a.name.trim() || "None yet"}</MetadataListItem>
        <MetadataListItem label="Mail ends in">.{a.slug}@co-worker.tech</MetadataListItem>
        <MetadataListItem label="Where data lives">{REGIONS.find((r) => r.value === a.region)?.label}</MetadataListItem>
        <MetadataListItem label="Who can join">
          {a.join === "invite" ? "Invite only" : "Anyone at your mail domain can ask"}
        </MetadataListItem>
        <MetadataListItem label="Model">{MODELS.find((m) => m.id === a.model)?.label}</MetadataListItem>
        <MetadataListItem label="Most it may spend">${a.limit} a day</MetadataListItem>
        <MetadataListItem label="Connector">
          {connector === undefined ? "None yet" : connector.id === "github" ? `GitHub: ${a.repos.join(", ")}` : connector.label}
        </MetadataListItem>
      </MetadataList>
      <Divider />
      <Card variant="muted" padding={5}>
        <VStack gap={0.5}>
          <Text type="label">What happens then</Text>
          <Text type="supporting" color="secondary">
            Your workspace starts with one manager, Juno. It looks after all the others.{" "}
            {connector === undefined
              ? "Tell it what you need, and it makes the first one."
              : `${connector.next} You see what it will do before it starts.`}
          </Text>
        </VStack>
      </Card>
    </VStack>
  );
}

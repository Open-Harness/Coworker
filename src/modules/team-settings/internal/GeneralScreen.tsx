import { useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Layout";
import { MetadataList, MetadataListItem } from "@astryxdesign/core/MetadataList";
import { Selector } from "@astryxdesign/core/Selector";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { useNarrow } from "~/modules/team-core/service.ts";
import type { Loaded } from "~/modules/team-core/types.ts";
import { Page, PageSection } from "~/modules/ui/service.ts";
import type { GeneralData, SaveGeneral } from "../types.ts";
import { ConfirmDialog } from "./ConfirmDialog.tsx";
import { LogoField } from "./LogoField.tsx";
import { SaveBar } from "./SaveBar.tsx";
import { useDraft } from "./use-draft.ts";
import { useSaving } from "./use-saving.ts";
import { useUnsaved } from "./Unsaved.tsx";
import { day, modelKey, timeZones } from "./words.ts";

const REGION = { eu: "European Union", us: "United States" } as const;
const NO_MODEL = "none";

export interface GeneralScreenProps {
  readonly general: GeneralData;
  readonly logoSrc: string | undefined;
  readonly exportHref: string;
  readonly onSave: (input: SaveGeneral) => Promise<Loaded<true>>;
  readonly onLogo: (file: File) => Promise<Loaded<true>>;
  readonly onRemoveLogo: () => Promise<Loaded<true>>;
  readonly onDelete: () => Promise<Loaded<true>>;
  /** Leaves the app for a download. */
  readonly onDownload: (href: string) => void;
}

/** What the workspace is called, where it is, what new agents start from, and the ways out of it. */
export function GeneralScreen({ general, logoSrc, exportHref, onSave, onLogo, onRemoveLogo, onDelete, onDownload }: GeneralScreenProps) {
  const saved: SaveGeneral = {
    name: general.name,
    address: general.address,
    timeZone: general.timeZone,
    defaultModel: general.defaultModel,
  };
  const { value, change, isDirty, discard } = useDraft(saved);
  const saver = useSaving();
  const [isAsking, setIsAsking] = useState<"address" | "delete">();
  const isNarrow = useNarrow();
  useUnsaved(isDirty);
  const zones = timeZones(general.timeZone);
  const choices = general.choices.flatMap(({ connectionId, label, models }) =>
    models.map((model) => ({ connectionId, model, label: `${label} · ${model}` })),
  );
  const address = value.address.trim().toLowerCase();
  const save = async (): Promise<Loaded<true>> => {
    await saver.run(onSave({ ...value, name: value.name.trim(), address }));
    return { _tag: "Loaded", value: true };
  };
  const trySave = async () => void (address === general.address ? await save() : setIsAsking("address"));
  return (
    <Page title="General" description="What this workspace is called and where it lives.">
      <PageSection title="Workspace">
        <Card padding={5}>
          <VStack gap={5}>
            <LogoField name={general.name} src={logoSrc} onUpload={onLogo} onRemove={onRemoveLogo} />
            <TextInput label="Name" value={value.name} onChange={(name) => change({ name })} width="100%" />
            <TextInput
              label="Address"
              value={value.address}
              onChange={(address) => change({ address })}
              description={`Managers get email addresses ending in .${address}@${general.mailDomain}. Changing it breaks old reply addresses.`}
              width="100%"
            />
            <HStack gap={3} wrap="wrap">
              <StackItem size="fill">
                <Selector
                  label="Default time zone"
                  hasSearch
                  options={[...zones]}
                  value={value.timeZone}
                  onChange={(timeZone) => change({ timeZone })}
                  width="100%"
                />
              </StackItem>
              <StackItem size="fill">
                <Selector
                  label="Default model for new agents"
                  options={[
                    { value: NO_MODEL, label: "None chosen" },
                    ...choices.map((choice) => ({ value: modelKey(choice), label: choice.label })),
                  ]}
                  value={value.defaultModel === null ? NO_MODEL : modelKey(value.defaultModel)}
                  onChange={(key) => {
                    const found = choices.find((choice) => modelKey(choice) === key);
                    change({ defaultModel: found === undefined ? null : { connectionId: found.connectionId, model: found.model } });
                  }}
                  width="100%"
                />
              </StackItem>
            </HStack>
            <SaveBar status={saver.status} isDirty={isDirty} onSave={trySave} onDiscard={discard} />
          </VStack>
        </Card>
      </PageSection>
      <PageSection title="Data">
        <Card padding={5}>
          <VStack gap={4}>
            <MetadataList label={{ position: isNarrow ? "top" : "start", width: 160 }}>
              <MetadataListItem label="Data region">{`${REGION[general.region]}. Set when the workspace was made.`}</MetadataListItem>
              <MetadataListItem label="Created">{day(general.createdAt)}</MetadataListItem>
            </MetadataList>
            <HStack gap={3} vAlign="center" wrap="wrap">
              <Button label="Export everything" onClick={() => onDownload(exportHref)} />
              <Text type="supporting">A zip of what the workspace holds. Secret values are never in it.</Text>
            </HStack>
          </VStack>
        </Card>
      </PageSection>
      <PageSection title="Danger zone">
        <Card padding={5}>
          <HStack gap={4} vAlign="center" wrap="wrap">
            <StackItem size="fill">
              <VStack gap={0}>
                <Text weight="medium">Delete this workspace</Text>
                <Text type="supporting">
                  Every manager, board, mission and key goes with it, and so does the key its data is encrypted with.
                </Text>
              </VStack>
            </StackItem>
            <Button label="Delete workspace" variant="destructive" onClick={() => setIsAsking("delete")} />
          </HStack>
        </Card>
      </PageSection>
      <ConfirmDialog
        isOpen={isAsking === "address"}
        title="Change the address?"
        description={`Every manager's email address changes to end in .${address}@${general.mailDomain}. Mail sent to the old addresses will not arrive.`}
        actionLabel="Change address"
        onClose={() => setIsAsking(undefined)}
        onConfirm={save}
      />
      <ConfirmDialog
        isOpen={isAsking === "delete"}
        title={`Delete ${general.name}?`}
        description="This cannot be undone. Everyone loses the workspace, its managers and everything they made."
        actionLabel="Delete workspace"
        typed={general.name}
        onClose={() => setIsAsking(undefined)}
        onConfirm={onDelete}
      />
    </Page>
  );
}

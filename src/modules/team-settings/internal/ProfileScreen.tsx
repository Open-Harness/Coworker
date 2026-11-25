import type { ReactNode } from "react";
import { Avatar } from "@astryxdesign/core/Avatar";
import { Card } from "@astryxdesign/core/Card";
import { CheckboxList, CheckboxListItem } from "@astryxdesign/core/CheckboxList";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Layout";
import { MetadataList, MetadataListItem } from "@astryxdesign/core/MetadataList";
import { Selector } from "@astryxdesign/core/Selector";
import { Switch } from "@astryxdesign/core/Switch";
import { TextInput } from "@astryxdesign/core/TextInput";
import { TimeInput } from "@astryxdesign/core/TimeInput";
import { createISOTimeString } from "@astryxdesign/core/utils";
import { useNarrow } from "~/modules/team-core/service.ts";
import type { Loaded } from "~/modules/team-core/types.ts";
import { Page, PageSection } from "~/modules/ui/service.ts";
import type { MeData, ProfileData } from "../types.ts";
import { SaveBar } from "./SaveBar.tsx";
import { useUnsaved } from "./Unsaved.tsx";
import { useDraft } from "./use-draft.ts";
import { useSaving } from "./use-saving.ts";
import { roleLabel, timeZones } from "./words.ts";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const WORKDAYS = [1, 2, 3, 4, 5];
const WORKSPACE_ZONE = "";

/** The name is the account's: every workspace this person is in shows the new one. */
function You({ me, onName }: { readonly me: MeData; readonly onName: (name: string) => Promise<Loaded<true>> }) {
  const { value, change, isDirty, discard } = useDraft({ name: me.name });
  const saver = useSaving();
  const isNarrow = useNarrow();
  useUnsaved(isDirty);
  return (
    <PageSection title="You">
      <Card padding={5}>
        <VStack gap={5}>
          <HStack gap={4} vAlign="center">
            <Avatar name={value.name} size="lg" tooltip={false} />
            <StackItem size="fill">
              <TextInput label="Name" value={value.name} onChange={(name) => change({ name })} width="100%" />
            </StackItem>
          </HStack>
          <MetadataList label={{ position: isNarrow ? "top" : "start", width: 120 }}>
            <MetadataListItem label="Email">{me.email}</MetadataListItem>
            <MetadataListItem label="Role here">{roleLabel(me.role)}</MetadataListItem>
          </MetadataList>
          <SaveBar
            label="Save name"
            status={saver.status}
            isDirty={isDirty && value.name.trim() !== ""}
            onDiscard={discard}
            onSave={async () => void (await saver.run(onName(value.name.trim())))}
          />
        </VStack>
      </Card>
    </PageSection>
  );
}

/** Who you are here, how managers know you, when they may expect you, and where you are signed in. */
export function ProfileScreen({
  me,
  workspaceName,
  onSave,
  onName,
  accounts,
  signIns,
}: {
  readonly me: MeData;
  readonly workspaceName: string;
  readonly onName: (name: string) => Promise<Loaded<true>>;
  /** The sections that load on their own. */
  readonly accounts?: ReactNode;
  readonly signIns?: ReactNode;
  readonly onSave: (profile: ProfileData) => Promise<Loaded<true>>;
}) {
  const { value, change, isDirty, discard } = useDraft(me.profile);
  const saver = useSaving();
  useUnsaved(isDirty);
  const hours = value.workingHours;
  return (
    <Page title="Profile" description={`How ${workspaceName} sees you.`}>
      <You me={me} onName={onName} />
      {accounts}
      <PageSection title="Time">
        <Card padding={5}>
          <VStack gap={5}>
            <HStack gap={3} wrap="wrap">
              <StackItem size="fill">
                <Selector
                  label="Time zone"
                  hasSearch
                  options={[{ value: WORKSPACE_ZONE, label: "The workspace's own" }, ...timeZones(value.timeZone ?? undefined)]}
                  value={value.timeZone ?? WORKSPACE_ZONE}
                  onChange={(zone) => change({ timeZone: zone === WORKSPACE_ZONE ? null : zone })}
                  width="100%"
                />
              </StackItem>
            </HStack>
            <Switch
              label="I have working hours"
              description="Notifications can hold email outside them. The Inbox still shows everything at once."
              value={hours !== null}
              onChange={(on) => change({ workingHours: on ? { days: WORKDAYS, from: "09:00", to: "17:00" } : null })}
              labelPosition="start"
              labelSpacing="spread"
              width="100%"
            />
            {hours !== null && (
              <VStack gap={4}>
                <HStack gap={3} wrap="wrap">
                  <TimeInput
                    label="From"
                    hourFormat="24h"
                    value={createISOTimeString(hours.from) ?? undefined}
                    onChange={(from) => from !== undefined && change({ workingHours: { ...hours, from: from.slice(0, 5) } })}
                  />
                  <TimeInput
                    label="To"
                    hourFormat="24h"
                    value={createISOTimeString(hours.to) ?? undefined}
                    onChange={(to) => to !== undefined && change({ workingHours: { ...hours, to: to.slice(0, 5) } })}
                  />
                </HStack>
                <CheckboxList
                  label="Days"
                  value={hours.days.map(String)}
                  onChange={(days) => change({ workingHours: { ...hours, days: days.map(Number).toSorted() } })}
                  width="100%"
                >
                  {DAYS.map((name, index) => (
                    <CheckboxListItem key={name} value={String(index)} label={name} />
                  ))}
                </CheckboxList>
              </VStack>
            )}
            <SaveBar
              status={saver.status}
              isDirty={isDirty}
              onDiscard={discard}
              onSave={async () => void (await saver.run(onSave(value)))}
            />
          </VStack>
        </Card>
      </PageSection>
      {signIns}
    </Page>
  );
}

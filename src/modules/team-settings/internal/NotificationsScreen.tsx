import { Card } from "@astryxdesign/core/Card";
import { VStack } from "@astryxdesign/core/Layout";
import { Switch } from "@astryxdesign/core/Switch";
import { Text } from "@astryxdesign/core/Text";
import type { Loaded } from "~/modules/team-core/types.ts";
import { Page, PageSection } from "~/modules/ui/service.ts";
import type { NotificationData } from "../types.ts";
import { SaveBar } from "./SaveBar.tsx";
import { useUnsaved } from "./Unsaved.tsx";
import { useDraft } from "./use-draft.ts";
import { useSaving } from "./use-saving.ts";

/** What the Inbox gets is everything. These choose what is also sent to your email. */
export function NotificationsScreen({
  notifications,
  onSave,
}: {
  readonly notifications: NotificationData;
  readonly onSave: (notifications: NotificationData) => Promise<Loaded<true>>;
}) {
  const { value, change, isDirty, discard } = useDraft(notifications);
  const saver = useSaving();
  useUnsaved(isDirty);
  const setEmail = (event: string, email: boolean) =>
    change({ events: value.events.map((entry) => (entry.event === event ? { ...entry, email } : entry)) });
  return (
    <Page title="Notifications" description="The Inbox always has everything. These choose what also follows you to your email.">
      <PageSection title="Email me when">
        <Card padding={5}>
          <VStack gap={4}>
            {value.events.map(({ event, label, email }) => (
              <Switch
                key={event}
                label={label}
                value={email}
                onChange={(on) => setEmail(event, on)}
                labelPosition="start"
                labelSpacing="spread"
                width="100%"
              />
            ))}
            <Switch
              label="Hold email outside my working hours"
              description="The Inbox still shows it at once. Set your working hours in your profile."
              value={value.quietHours}
              onChange={(quietHours) => change({ quietHours })}
              labelPosition="start"
              labelSpacing="spread"
              width="100%"
            />
            {value.events.length === 0 && <Text color="secondary">Nothing here can be sent to email yet.</Text>}
            <SaveBar
              status={saver.status}
              isDirty={isDirty}
              onDiscard={discard}
              onSave={async () => void (await saver.run(onSave(value)))}
            />
          </VStack>
        </Card>
      </PageSection>
    </Page>
  );
}

import { Banner } from "@astryxdesign/core/Banner";
import { Card } from "@astryxdesign/core/Card";
import { Divider } from "@astryxdesign/core/Divider";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Layout";
import { NumberInput } from "@astryxdesign/core/NumberInput";
import { ProgressBar } from "@astryxdesign/core/ProgressBar";
import { Switch } from "@astryxdesign/core/Switch";
import { Heading, Text } from "@astryxdesign/core/Text";
import type { Loaded } from "~/modules/team-core/types.ts";
import { Page, PageSection } from "~/modules/ui/service.ts";
import type { BillingData } from "../types.ts";
import { SaveBar } from "./SaveBar.tsx";
import { useUnsaved } from "./Unsaved.tsx";
import { useDraft } from "./use-draft.ts";
import { useSaving } from "./use-saving.ts";
import { day, dollars, hours, soFar } from "./words.ts";

function Plan({ billing }: { readonly billing: BillingData }) {
  const { seats, nextSeats, seatCents } = billing;
  return (
    <Card padding={5}>
      <HStack gap={4} vAlign="start">
        <StackItem size="fill">
          <VStack gap={1}>
            <Heading level={3}>{billing.plan}</Heading>
            <Text color="secondary">{`${dollars(seatCents)} a seat each month · ${seats} ${seats === 1 ? "seat" : "seats"}`}</Text>
            <Text type="supporting">
              {`Renews ${day(billing.renewsAt)}${nextSeats === seats ? "" : `, then with ${nextSeats} ${nextSeats === 1 ? "seat" : "seats"}`}`}
            </Text>
          </VStack>
        </StackItem>
        <VStack gap={0} hAlign="end">
          <Heading level={2} accessibilityLevel={3}>
            {dollars(soFar(billing))}
          </Heading>
          <Text type="supporting">this period so far</Text>
        </VStack>
      </HStack>
    </Card>
  );
}

type OnLimit = (on: boolean, overCents: number) => Promise<Loaded<true>>;

function Limit({ billing, onLimit }: { readonly billing: BillingData; readonly onLimit: OnLimit }) {
  const { value, change, isDirty, discard } = useDraft({ on: billing.limitOn, dollars: billing.limitCents / 100 });
  const saver = useSaving();
  useUnsaved(isDirty);
  return (
    <VStack gap={3}>
      <Switch
        label="Stop sandboxes at a limit"
        description="When it is reached no sandbox starts until the renewal. Managers carry on without them."
        value={value.on}
        onChange={(on) => change({ on })}
        labelPosition="start"
        labelSpacing="spread"
        width="100%"
      />
      {value.on && (
        <NumberInput
          label="Dollars over the plan"
          value={value.dollars}
          onChange={(dollars) => change({ dollars: dollars ?? 0 })}
          min={0}
          isIntegerOnly
          width={200}
        />
      )}
      <SaveBar
        label="Save limit"
        status={saver.status}
        isDirty={isDirty}
        onDiscard={discard}
        onSave={async () => void (await saver.run(onLimit(value.on, Math.round(value.dollars * 100))))}
      />
    </VStack>
  );
}

/** What the workspace pays: seats, and sandbox hours past the ones the seats include. */
export function BillingScreen({ billing, onLimit }: { readonly billing: BillingData; readonly onLimit: OnLimit }) {
  const { hoursUsed, hoursIncluded, hoursOver, overageCents, overageCentsPerHour } = billing;
  return (
    <Page title="Billing" description="Seats and sandbox time. Models never appear here: they run on your own keys and sign-ins.">
      {billing.stopped && (
        <Banner
          status="warning"
          title="Sandboxes are stopped"
          description={`This period reached ${dollars(billing.limitCents)} over the plan. Raise the limit or wait for ${day(billing.renewsAt)}.`}
        />
      )}
      <PageSection title="Plan">
        <Plan billing={billing} />
      </PageSection>
      <PageSection title="Sandboxes">
        <Card padding={5}>
          <VStack gap={4}>
            <ProgressBar
              label={`${hours(hoursUsed)} of ${hours(hoursIncluded)} included`}
              value={Math.min(hoursUsed, hoursIncluded)}
              max={Math.max(hoursIncluded, 1)}
              variant={hoursOver > 0 ? "warning" : "accent"}
            />
            <Text type="supporting">
              {hoursOver > 0
                ? `${hours(hoursOver)} past the plan at ${dollars(overageCentsPerHour)} an hour: ${dollars(overageCents)} so far.`
                : `After that, ${dollars(overageCentsPerHour)} an hour. ${hours(billing.includedHoursPerSeat)} are included with each seat.`}
            </Text>
            <Divider />
            <Limit billing={billing} onLimit={onLimit} />
          </VStack>
        </Card>
      </PageSection>
    </Page>
  );
}

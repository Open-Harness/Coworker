// astryx-template: form-wizard-dialog
import { useId, type ReactNode } from "react";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { CheckboxList, CheckboxListItem } from "@astryxdesign/core/CheckboxList";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { Divider } from "@astryxdesign/core/Divider";
import { Field } from "@astryxdesign/core/Field";
import { FormLayout } from "@astryxdesign/core/FormLayout";
import { Layout, LayoutContent, LayoutFooter, LayoutHeader } from "@astryxdesign/core/Layout";
import { MetadataList, MetadataListItem } from "@astryxdesign/core/MetadataList";
import { NumberInput } from "@astryxdesign/core/NumberInput";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Stack";
import { Step, Stepper } from "@astryxdesign/core/Stepper";
import { Switch } from "@astryxdesign/core/Switch";
import { TextArea } from "@astryxdesign/core/TextArea";
import { TextInput } from "@astryxdesign/core/TextInput";
import type { ISOTimeString } from "@astryxdesign/core/TimeInput";
import { TimeInput } from "@astryxdesign/core/TimeInput";
import { JUNO } from "../../juno/world";
import type { Draft, Target } from "./walk";

const STEPS = ["Job", "Connectors", "When and how far"];
const CONNECTORS = [["Email", `Writes as ${JUNO.mail}`], ["CRM", "Acme’s CRM, connected"], ["Slack", "acme.slack.com, connected"], ["WhatsApp", "Offline since 08:10"]] as const;
const OFTEN: Readonly<Record<string, string>> = { weekdays: "Weekdays", weekly: "Every Monday", monthly: "First of the month" };

/** The place a walkthrough points at. Its name is the field's own name in the action. */
export const Spot = ({ at, children }: { at: Target; children: ReactNode }) => <div data-spot={at}>{children}</div>;

export function Wizard({ d, onChange }: { d: Draft; onChange: (d: Partial<Draft>) => void }) {
  const id = useId(); const labelID = useId();
  const isLast = d.step === STEPS.length - 1;
  return (
    <Dialog isOpen isInline onOpenChange={() => onChange({ isOpen: false })} width="min(580px, 100%)" purpose="form">
      <Layout height="fill" padding={4} defaultHasDividers
        header={
          <>
            <DialogHeader title="New manager" onOpenChange={() => onChange({ isOpen: false })} hasDivider={false} />
            <LayoutHeader hasDivider={false}>
              <Stepper activeStep={d.step} orientation="horizontal" density="compact" label="New manager progress">{STEPS.map((label, i) => <Step key={label} step={i} label={label} />)}</Stepper>
            </LayoutHeader>
          </>
        }
        content={
          <LayoutContent>
            <VStack gap={5}>
              {d.step === 0 && (
                <FormLayout defaultOptionality="optional">
                  <Spot at="name"><TextInput label="Name" isRequired value={d.name} onChange={(name) => onChange({ name })} placeholder="Invoices" /></Spot>
                  <Spot at="job"><TextArea label="What it is for" isRequired rows={3} value={d.job} onChange={(job) => onChange({ job })} placeholder="One sentence. It is measured against this." /></Spot>
                </FormLayout>
              )}
              {d.step === 1 && (
                <FormLayout defaultOptionality="optional">
                  <Spot at="connectors">
                    <CheckboxList label="What it may use" value={[...d.connectors]} onChange={(connectors: string[]) => onChange({ connectors })} density="compact">
                      {CONNECTORS.map(([v, about]) => <CheckboxListItem key={v} value={v} label={v} description={<>{about}</>} />)}
                    </CheckboxList>
                  </Spot>
                  <Banner status="info" title="People only see Juno" description="Whatever it writes comes from Juno’s own address, and follows how Juno speaks to customers." />
                </FormLayout>
              )}
              {d.step === 2 && (
                <FormLayout defaultOptionality="optional">
                  <Spot at="often">
                    <FormLayout defaultOptionality="optional">
                      <Field label="Look for new work" inputID={id} labelID={labelID} isGroupLabel>
                        <SegmentedControl label="Look for new work" aria-labelledby={labelID} value={d.often} onChange={(often) => onChange({ often })} layout="fill">
                          <SegmentedControlItem value="weekdays" label="Weekdays" /><SegmentedControlItem value="weekly" label="Weekly" /><SegmentedControlItem value="monthly" label="Monthly" />
                        </SegmentedControl>
                      </Field>
                      <TimeInput label="At" value={(d.time || undefined) as ISOTimeString | undefined} onChange={(t) => onChange({ time: t ?? "" })} hourFormat="24h" />
                    </FormLayout>
                  </Spot>
                  <Spot at="limit"><NumberInput label="Most it may spend in a day, in dollars" value={d.limit} onChange={(limit: number) => onChange({ limit })} min={0} isIntegerOnly /></Spot>
                  <Spot at="maySend"><Switch label="May write to customers without asking you" description="Off: Juno shows you each mail first." value={d.maySend} onChange={(maySend: boolean) => onChange({ maySend })} labelPosition="start" labelSpacing="spread" /></Spot>
                  <Divider />
                  <MetadataList columns="single">
                    <MetadataListItem label="Manager">{d.name.trim() || "No name yet"}</MetadataListItem>
                    <MetadataListItem label="Uses">{d.connectors.join(", ") || "Nothing yet"}</MetadataListItem>
                    <MetadataListItem label="Starts">{d.often ? `${OFTEN[d.often]}${d.time ? `, ${d.time}` : ""}` : "When something arrives"}</MetadataListItem>
                  </MetadataList>
                </FormLayout>
              )}
            </VStack>
          </LayoutContent>
        }
        footer={
          <LayoutFooter>
            <HStack gap={2} vAlign="center">
              <Button label="Back" variant="secondary" isDisabled={d.step === 0} onClick={() => onChange({ step: d.step - 1 })} />
              <StackItem size="fill" />
              <Spot at="next"><Button label={isLast ? "Make it" : "Continue"} variant="primary" onClick={() => onChange(isLast ? { isOpen: false, made: true } : { step: d.step + 1 })} /></Spot>
            </HStack>
          </LayoutFooter>
        }
      />
    </Dialog>
  );
}

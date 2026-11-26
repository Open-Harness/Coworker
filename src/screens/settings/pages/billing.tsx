// astryx-template: settings
import { Button } from "@astryxdesign/core/Button";
import { Divider } from "@astryxdesign/core/Divider";
import { HStack, VStack } from "@astryxdesign/core/Layout";
import { MetadataList, MetadataListItem } from "@astryxdesign/core/MetadataList";
import { ProgressBar } from "@astryxdesign/core/ProgressBar";
import { pixel, proportional, Table, type TableColumn } from "@astryxdesign/core/Table";
import { Text } from "@astryxdesign/core/Text";
import { useToast } from "@astryxdesign/core/Toast";
import { Reading, useGo, useRead } from "~/modules/page/service.ts";
import type { BillingView } from "~/modules/views-workspace/types.ts";
import { useDoing } from "../doing.ts";
import { day, dollars } from "../format.ts";
import { Part } from "../part.tsx";

type Invoice = BillingView["invoices"][number] & Record<string, unknown>;
const month = (at: number, zone: string): string => new Intl.DateTimeFormat("en-GB", { timeZone: zone, month: "long" }).format(at);
const people = (n: number): string => `${n} ${n === 1 ? "person" : "people"}`;

function Billing({ view, zone }: { readonly view: BillingView; readonly zone: string }) {
  const [showToast, go, doing] = [useToast(), useGo(), useDoing()];
  const say = (body: string) => showToast({ body, uniqueID: body });
  const total = view.perPerson * view.people;
  const hours = view.boxHours;
  const whole = (i: Invoice): boolean => i.period.from === i.period.to || new Date(i.period.from).getUTCDate() <= 1;
  const cols: TableColumn<Invoice>[] = [
    { key: "date", header: "Date", width: pixel(80), renderCell: (r) => <Text type="body">{day(r.at, zone)}</Text> },
    {
      key: "what",
      header: "For",
      width: proportional(1, { minWidth: 110 }),
      renderCell: (r) => (
        <VStack gap={0}>
          <Text type="body" maxLines={1}>
            {whole(r) ? `${month(r.period.from, zone)}, ${people(r.people)}` : `From ${day(r.period.from, zone)}, ${people(r.people)}`}
          </Text>
          <Text type="supporting" color="secondary">
            {r.paid ? "Paid" : "Not paid"}
          </Text>
        </VStack>
      ),
    },
    {
      key: "total",
      header: "Total",
      width: pixel(80),
      renderCell: (r) => (
        <Text type="body" justify="end">
          {dollars(r.amount, true)}
        </Text>
      ),
    },
    {
      key: "get",
      header: "",
      width: pixel(88),
      renderCell: (r) => <Button label="PDF" size="sm" variant="ghost" onClick={() => void doing("billing.download", { invoice: r.id })} />,
    },
  ];
  return (
    <>
      <Part title="Plan" about="What the workspace pays for. Models are not in it: they are billed by their provider, on your keys.">
        <MetadataList columns="single" label={{ position: "start", width: 140 }}>
          <MetadataListItem label="Plan">{view.plan}</MetadataListItem>
          <MetadataListItem label="Price">{`${dollars(view.perPerson)} a person a month`}</MetadataListItem>
          <MetadataListItem label="Next invoice">{`${day(view.nextInvoice, zone)}, ${dollars(total, true)}`}</MetadataListItem>
        </MetadataList>
        <HStack gap={2}>
          <Button label="Change plan" size="sm" variant="secondary" onClick={() => say("Only an Owner can change the plan")} />
          <Button
            label="Update card"
            size="sm"
            variant="secondary"
            onClick={() => say("The card form is on our payment provider's page")}
          />
        </HStack>
      </Part>
      <Divider />
      <Part
        title="People"
        about="Everyone who has signed in counts. Someone invited does not, until they do. Outside people, like customers, never count."
      >
        <VStack gap={1}>
          <Text type="body">{`${view.people} people, ${dollars(total, true)} a month`}</Text>
          {view.notCounted.length > 0 && (
            <Text
              type="supporting"
              color="secondary"
            >{`${view.notCounted.join(", ")} ${view.notCounted.length === 1 ? "is" : "are"} invited and not counted yet.`}</Text>
          )}
        </VStack>
        <HStack>
          <Button label="See members" size="sm" variant="secondary" onClick={() => go("/settings/members")} />
        </HStack>
      </Part>
      <Divider />
      <Part
        title="Box hours"
        about="A box is the machine a thread works in, with its own copy of the repo. You pay for the hours it is on."
      >
        <ProgressBar
          label="Used this month"
          value={hours.used}
          max={hours.included}
          variant="neutral"
          hasValueLabel
          formatValueLabel={() => `${hours.used} of ${hours.included} hours`}
        />
        <Text
          type="supporting"
          color="secondary"
        >{`${hours.included} hours are in the plan, then $${hours.overPerHour.toFixed(2)} an hour past that.`}</Text>
      </Part>
      <Divider />
      <Part title="Invoices" about="Newest first.">
        <Table<Invoice> data={view.invoices.map((i) => ({ ...i }))} columns={cols} idKey="id" density="balanced" dividers="rows" />
      </Part>
    </>
  );
}

export default function BillingPage() {
  const shell = useRead("/shell");
  const zone = shell._tag === "Ok" ? shell.value.workspace.zone : "UTC";
  return <Reading from="/settings/billing">{(view) => <Billing view={view} zone={zone} />}</Reading>;
}

// astryx-template: settings
import { Button } from "@astryxdesign/core/Button";
import { Divider } from "@astryxdesign/core/Divider";
import { HStack, VStack } from "@astryxdesign/core/Layout";
import { MetadataList, MetadataListItem } from "@astryxdesign/core/MetadataList";
import { ProgressBar } from "@astryxdesign/core/ProgressBar";
import { pixel, proportional, Table, type TableColumn } from "@astryxdesign/core/Table";
import { Text } from "@astryxdesign/core/Text";
import { useToast } from "@astryxdesign/core/Toast";
import { Part } from "../../../part";
import { INVOICES, PLAN } from "../facts/money";

type Invoice = (typeof INVOICES)[number] & Record<string, unknown>;

export default function Billing({ onDirty }: { onDirty: () => void }) {
  void onDirty;
  const showToast = useToast();
  const say = (body: string) => showToast({ body, uniqueID: body });
  const month = PLAN.perPerson * PLAN.people;
  const cols: TableColumn<Invoice>[] = [
    { key: "date", header: "Date", width: pixel(80), renderCell: (r) => <Text type="body">{r.date}</Text> },
    { key: "what", header: "For", width: proportional(1, { minWidth: 110 }), renderCell: (r) => <VStack gap={0}><Text type="body" maxLines={1}>{r.what}</Text><Text type="supporting" color="secondary">{r.state}</Text></VStack> },
    { key: "total", header: "Total", width: pixel(80), renderCell: (r) => <Text type="body" align="end">{`$${r.total}.00`}</Text> },
    { key: "get", header: "", width: pixel(88), renderCell: (r) => <Button label="PDF" size="sm" variant="ghost" onClick={() => say(`Invoice of ${r.date} saved`)} /> },
  ];
  return (
    <>
      <Part title="Plan" about="What the workspace pays for. Models are not in it: they are billed by their provider, on your keys.">
        <MetadataList columns="single" label={{ position: "start", width: 140 }}>
          <MetadataListItem label="Plan">{PLAN.name}</MetadataListItem>
          <MetadataListItem label="Price">{`$${PLAN.perPerson} a person a month`}</MetadataListItem>
          <MetadataListItem label="Next invoice">{`${PLAN.next}, $${month}.00`}</MetadataListItem>
        </MetadataList>
        <HStack gap={2}><Button label="Change plan" size="sm" variant="secondary" onClick={() => say("Only an Owner can change the plan")} /><Button label="Update card" size="sm" variant="secondary" onClick={() => say("The card form is on our payment provider's page")} /></HStack>
      </Part>
      <Divider />
      <Part title="People" about="Everyone who has signed in counts. Someone invited does not, until they do. Outside people, like customers, never count.">
        <VStack gap={1}><Text type="body">{`${PLAN.people} people, $${month}.00 a month`}</Text><Text type="supporting" color="secondary">Ngozi Eze is invited and not counted yet.</Text></VStack>
        <HStack><Button label="See members" size="sm" variant="secondary" onClick={() => { location.hash = "set-members"; }} /></HStack>
      </Part>
      <Divider />
      <Part title="Box hours" about="A box is the machine a thread works in, with its own copy of the repo. You pay for the hours it is on.">
        <ProgressBar label="Used this month" value={PLAN.hoursUsed} max={PLAN.hoursIncluded} variant="neutral" hasValueLabel formatValueLabel={() => `${PLAN.hoursUsed} of ${PLAN.hoursIncluded} hours`} />
        <Text type="supporting" color="secondary">{`${PLAN.hoursIncluded} hours are in the plan, then ${PLAN.over}.`}</Text>
      </Part>
      <Divider />
      <Part title="Invoices" about="Newest first.">
        <Table<Invoice> data={INVOICES.map((i) => ({ ...i }))} columns={cols} idKey="id" density="balanced" dividers="rows" />
      </Part>
    </>
  );
}

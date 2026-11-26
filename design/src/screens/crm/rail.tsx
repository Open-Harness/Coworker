import { LayoutPanel, VStack } from "@astryxdesign/core/Layout";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Collapsible } from "@astryxdesign/core/Collapsible";
import { MetadataList, MetadataListItem } from "@astryxdesign/core/MetadataList";
import { MAY } from "./data";
import type { Deal } from "./data";

/** The company, its people, the notes, and what Sales may do here. */
export function PanelContent({ deal, sectionLevel = 2 }: { deal: Deal; sectionLevel?: 2 | 3 }) {
  const title = (text: string) => <Heading level={4} accessibilityLevel={sectionLevel}>{text}</Heading>;
  return (
    <VStack gap={4}>
      <Collapsible trigger={title("Company")}>
        <MetadataList>
          <MetadataListItem label="Name">{deal.company}</MetadataListItem>
          <MetadataListItem label="Site">{deal.site}</MetadataListItem>
          <MetadataListItem label="Size">{deal.size}</MetadataListItem>
          <MetadataListItem label="Based in">{deal.city}</MetadataListItem>
        </MetadataList>
      </Collapsible>
      <Collapsible trigger={title("People")}>
        <VStack gap={3}>
          {deal.people.map((p) => (
            <MetadataList key={p.email}>
              <MetadataListItem label="Name">{p.name}</MetadataListItem>
              <MetadataListItem label="Role">{p.role}</MetadataListItem>
              <MetadataListItem label="Email">{p.email}</MetadataListItem>
            </MetadataList>
          ))}
        </VStack>
      </Collapsible>
      <Collapsible trigger={title("Notes")}>
        {deal.notes.length === 0 ? (
          <Text type="body" color="secondary">No notes yet.</Text>
        ) : (
          <VStack gap={3}>
            {deal.notes.map((n, i) => (
              <VStack key={i} gap={0}>
                <Text type="body">{n.text}</Text>
                <Text type="supporting" color="secondary" hasTabularNumbers>{`${n.by}, ${n.at}`}</Text>
              </VStack>
            ))}
          </VStack>
        )}
      </Collapsible>
      <Collapsible trigger={title("What Sales may do here")}>
        <MetadataList>
          {MAY.map((m) => <MetadataListItem key={m.label} label={m.label}>{m.level}</MetadataListItem>)}
        </MetadataList>
      </Collapsible>
    </VStack>
  );
}

export function RightPanel({ deal }: { deal: Deal }) {
  return (
    <LayoutPanel width={320} padding={4} role="complementary">
      <PanelContent deal={deal} />
    </LayoutPanel>
  );
}

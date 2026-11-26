// astryx-template: library
import { useMemo, useState } from "react";
import { Center } from "@astryxdesign/core/Center";
import { Divider } from "@astryxdesign/core/Divider";
import { Grid } from "@astryxdesign/core/Grid";
import { HStack, VStack } from "@astryxdesign/core/Layout";
import { Heading, Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { ToggleButton, ToggleButtonGroup } from "@astryxdesign/core/ToggleButton";
import { MagnifyingGlassIcon as SearchIcon } from "@heroicons/react/24/outline";
import { TemplateCard } from "../../new/cards";
import { KINDS, TEMPLATES, type KindName } from "../../new/data";

export const meta = { save: false };

/** What a manager can be made from: a playbook with blanks. Ours, and your managers saved as one. */
export default function Templates() {
  const [kind, setKind] = useState<KindName>("All");
  const [search, setSearch] = useState("");
  const [gone, setGone] = useState<readonly string[]>([]);
  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return TEMPLATES.filter((t) => !gone.includes(t.id) && (kind === "All" || (kind === "Ours") === t.ours) && (q === "" || `${t.name} ${t.about} ${t.connectors.join(" ")}`.toLowerCase().includes(q)));
  }, [kind, search, gone]);
  const sections = (kind === "All" ? ["Ours", "Yours"] : [kind]).map((k) => ({ k, items: shown.filter((t) => t.ours === (k === "Ours")) })).filter((s) => s.items.length > 0);
  return (
    <VStack gap={5}>
      <VStack gap={1}>
        <Heading level={2}>Templates</Heading>
        <Text type="supporting" color="secondary">A template is a playbook with blanks. Any number of managers are made from one, and each keeps its own copy. Save one of your managers as a template from its Settings.</Text>
      </VStack>
      <VStack gap={3}>
        <TextInput label="Search" isLabelHidden placeholder="Search templates..." value={search} onChange={setSearch} startIcon={SearchIcon} />
        <HStack>
          <ToggleButtonGroup label="Show" value={kind} onChange={(v) => setKind((v ?? "All") as KindName)}>
            {KINDS.map((k) => <ToggleButton key={k} label={k} value={k} />)}
          </ToggleButtonGroup>
        </HStack>
      </VStack>
      {sections.length === 0 ? (
        <Center minHeight={160}><Text type="supporting" color="secondary">{kind === "Yours" && search === "" ? "None yet. Save one of your managers as a template, from its Settings." : "No template found."}</Text></Center>
      ) : (
        <VStack gap={5}>
          {sections.flatMap((s) => [
            <Divider key={`d-${s.k}`} />,
            <VStack key={s.k} gap={4}>
              <Heading level={3} accessibilityLevel={2}>{s.k}</Heading>
              <Grid columns={{ minWidth: 280, max: 3 }} gap={4}>{s.items.map((t) => <TemplateCard key={t.id} t={t} onTakeAway={(id) => setGone((g) => [...g, id])} />)}</Grid>
            </VStack>,
          ])}
        </VStack>
      )}
    </VStack>
  );
}

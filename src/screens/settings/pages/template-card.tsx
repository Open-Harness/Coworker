// astryx-template: library
import { useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { DropdownMenu } from "@astryxdesign/core/DropdownMenu";
import { Icon } from "@astryxdesign/core/Icon";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Layout";
import { Section } from "@astryxdesign/core/Section";
import { Heading, Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Token } from "@astryxdesign/core/Token";
import { useToast } from "@astryxdesign/core/Toast";
import { EllipsisHorizontalIcon } from "@heroicons/react/24/outline";
import { useGo } from "~/modules/page/service.ts";
import type { TemplatesView } from "~/modules/views-workspace/types.ts";
import { connectorName, day } from "../format.ts";

export type Template = TemplatesView["templates"][number];

/** How many managers, said plainly: “Coding and 1 other”. */
export function madeFrom(t: Template): string {
  const [first, ...others] = t.managers;
  if (first === undefined) return "No manager yet";
  if (others.length === 0) return `1 manager: ${first.name}`;
  return `${t.managers.length} managers: ${first.name} and ${others.length} other`;
}

/** One template, as a card of the library. */
export function TemplateCard({
  t,
  zone,
  onTakeAway,
}: {
  readonly t: Template;
  readonly zone: string;
  readonly onTakeAway: (id: string) => void;
}) {
  const [showToast, go] = [useToast(), useGo()];
  const [name, setName] = useState(t.name);
  const [draft, setDraft] = useState<string | null>(null);
  const behind = t.managers.filter((m) => m.behind);
  return (
    <Card padding={0} style={{ height: "100%" }}>
      <Section variant="transparent" padding={4} style={{ height: "100%" }}>
        <VStack gap={3} style={{ height: "100%" }}>
          <HStack gap={2} vAlign="start">
            <StackItem size="fill">
              {draft === null ? (
                <Heading level={3}>{name}</Heading>
              ) : (
                <HStack gap={1} vAlign="center">
                  <StackItem size="fill">
                    <TextInput label="Name" isLabelHidden size="sm" value={draft} onChange={(v: string) => setDraft(v)} />
                  </StackItem>
                  <Button
                    label="Keep"
                    size="sm"
                    variant="secondary"
                    isDisabled={draft.trim() === ""}
                    onClick={() => {
                      setName(draft.trim());
                      setDraft(null);
                      showToast({ body: "Renamed. Managers made from it keep their names.", uniqueID: `rename-${t.id}` });
                    }}
                  />
                </HStack>
              )}
            </StackItem>
            <DropdownMenu
              hasChevron={false}
              alignment="end"
              button={{
                label: `Actions for ${name}`,
                variant: "ghost",
                size: "sm",
                icon: <Icon icon={EllipsisHorizontalIcon} size="sm" />,
                isIconOnly: true,
              }}
              items={[
                { label: "Rename", onClick: () => setDraft(name) },
                {
                  label: "Take away",
                  onClick: () => {
                    onTakeAway(t.id);
                    showToast({
                      body: `${name} is gone from the library. Managers made from it keep their copy.`,
                      uniqueID: `away-${t.id}`,
                    });
                  },
                },
              ]}
            />
          </HStack>
          <Text type="body" size="sm" color="secondary">
            {t.about}
          </Text>
          <HStack gap={1} wrap="wrap">
            <Text type="supporting" color="secondary">
              Needs
            </Text>
            {t.needs.map((c) => (
              <Token key={c} size="sm" color="gray" label={connectorName(c)} />
            ))}
          </HStack>
          <VStack gap={0.5}>
            <Text type="supporting" color="secondary">
              {madeFrom(t)}
            </Text>
            <HStack gap={1.5} vAlign="center" wrap="wrap">
              <Text type="supporting" color="secondary">
                {t.whose === "ours" || t.saved === null ? "Ours" : `Saved from ${t.saved.from} on ${day(t.saved.at, zone)}`}, version{" "}
                {t.version}
              </Text>
              {behind.length > 0 && <Token size="sm" color="blue" label="A newer version" />}
            </HStack>
            {behind.length > 0 && (
              <Text type="supporting" color="secondary">
                {behind.map((m) => `${m.name} is on ${m.on}`).join(", ")}, the newest is {t.version}.
              </Text>
            )}
          </VStack>
          <StackItem size="fill" />
          <HStack>
            <Button
              label="New manager"
              size="sm"
              variant="secondary"
              aria-label={`New manager from ${name}`}
              onClick={() => go(`/managers/new/${t.id}`)}
            />
          </HStack>
        </VStack>
      </Section>
    </Card>
  );
}

import { useState } from "react";
import { Banner } from "@astryxdesign/core/Banner";
import { Card } from "@astryxdesign/core/Card";
import { Collapsible } from "@astryxdesign/core/Collapsible";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Layout";
import { Selector } from "@astryxdesign/core/Selector";
import { Text } from "@astryxdesign/core/Text";
import type { Loaded } from "~/modules/team-core/types.ts";
import type { Permission, PersonPermissions, RolesData, SetChange } from "../types.ts";
import { actionsOf, categoryLabel, categorySays, PERMISSION_LABEL, PERMISSIONS, presetSays } from "./roles-words.ts";
import { useSaving } from "./use-saving.ts";
import { roleLabel } from "./words.ts";

const PRESET = "preset";
const isPermission = (value: string): value is Permission => PERMISSIONS.some((name) => name === value);

/** One row: what the preset says, and the person's own on, ask or off over it. */
function Choice({
  label,
  says,
  own,
  onPick,
}: {
  readonly label: string;
  readonly says: Permission | "mixed";
  readonly own: Permission | undefined;
  readonly onPick: (value: Permission | null) => Promise<void>;
}) {
  return (
    <Selector
      label={label}
      isLabelHidden
      size="sm"
      width={190}
      value={own ?? PRESET}
      options={[
        { value: PRESET, label: `Preset: ${says === "mixed" ? "Mixed" : PERMISSION_LABEL[says]}` },
        ...PERMISSIONS.map((value) => ({ value, label: `Their own: ${PERMISSION_LABEL[value]}` })),
      ]}
      changeAction={(value) => onPick(isPermission(value) ? value : null)}
    />
  );
}

/** What one person may do over their preset, a category or a single action at a time. Each pick is saved at once. */
export function PersonChanges({
  roles,
  people,
  initialPerson,
  onChange,
}: {
  readonly roles: RolesData;
  readonly people: readonly PersonPermissions[];
  readonly initialPerson: string | undefined;
  readonly onChange: (change: SetChange) => Promise<Loaded<true>>;
}) {
  const [personId, setPersonId] = useState(initialPerson ?? people[0]?.person);
  const saver = useSaving();
  const person = people.find((entry) => entry.person === personId);
  if (person === undefined) return <EmptyState title="Nobody to change yet" isCompact />;
  const set = roles.presets[person.preset];
  const ownOf = (scope: "category" | "action", key: string) => person.changes.find((c) => c.scope === scope && c.key === key)?.value;
  const pick = (scope: "category" | "action", key: string) => async (value: Permission | null) => {
    await saver.run(onChange({ person: person.person, scope, key, value }));
  };
  return (
    <VStack gap={4}>
      <Selector
        label="Person"
        width="100%"
        options={people.map(({ person: id, name, preset }) => ({ value: id, label: `${name} · ${roleLabel(preset)}` }))}
        value={person.person}
        onChange={setPersonId}
      />
      {saver.status.state === "failed" && <Banner status="error" title="Not saved" description={saver.status.message} />}
      <Text type="supporting" role="status">
        {saver.status.state === "saving"
          ? "Saving…"
          : saver.status.state === "saved"
            ? "Saved"
            : `${person.name} starts from the ${roleLabel(person.preset)} preset.`}
      </Text>
      {roles.categories.map((category) => {
        const actions = actionsOf(roles, category);
        return (
          <Card key={category} padding={3}>
            <VStack gap={2}>
              <HStack gap={3} vAlign="center" wrap="wrap">
                <StackItem size="fill">
                  <Text weight="medium">{categoryLabel(category)}</Text>
                </StackItem>
                <Choice
                  label={`${categoryLabel(category)} for ${person.name}`}
                  says={categorySays(set, actions)}
                  own={ownOf("category", category)}
                  onPick={pick("category", category)}
                />
              </HStack>
              <Collapsible defaultIsOpen={false} trigger={<Text type="supporting">{`Single actions · ${actions.length}`}</Text>}>
                <VStack gap={2}>
                  {actions.map((action) => (
                    <HStack key={action.id} gap={3} vAlign="center" wrap="wrap">
                      <StackItem size="fill">
                        <Text>{action.label}</Text>
                      </StackItem>
                      <Choice
                        label={`${action.label} for ${person.name}`}
                        says={presetSays(set, action)}
                        own={ownOf("action", action.id)}
                        onPick={pick("action", action.id)}
                      />
                    </HStack>
                  ))}
                </VStack>
              </Collapsible>
            </VStack>
          </Card>
        );
      })}
    </VStack>
  );
}

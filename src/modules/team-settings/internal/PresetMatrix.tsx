import { Badge } from "@astryxdesign/core/Badge";
import { Card } from "@astryxdesign/core/Card";
import { Collapsible } from "@astryxdesign/core/Collapsible";
import { Divider } from "@astryxdesign/core/Divider";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Layout";
import { Text } from "@astryxdesign/core/Text";
import type { Permission, PermissionSet, Role, RolesData } from "../types.ts";
import { actionsOf, categoryLabel, categorySays, PERMISSION_LABEL, PRESET_ORDER, presetSays } from "./roles-words.ts";
import { roleLabel } from "./words.ts";

const VARIANT = { on: "success", ask: "warning", off: "neutral", mixed: "info" } as const;

const Says = ({ says, who }: { readonly says: Permission | "mixed"; readonly who: string }) => (
  <Badge variant={VARIANT[says]} label={`${who}: ${says === "mixed" ? "Mixed" : PERMISSION_LABEL[says]}`} />
);

/** Every preset's answer for every category, and for each action once a category is opened. Presets are fixed. */
export function PresetMatrix({ roles, mine }: { readonly roles: RolesData; readonly mine: Role }) {
  const set = (role: Role): PermissionSet => roles.presets[role];
  return (
    <VStack gap={3}>
      <Text type="supporting">
        {"Owner, Builder and Member are the three presets. Open a category to see each action. "}
        <Text as="span" weight="medium">{`You are ${roleLabel(mine)}.`}</Text>
      </Text>
      {roles.categories.map((category) => {
        const actions = actionsOf(roles, category);
        return (
          <Card key={category} padding={3}>
            <Collapsible
              defaultIsOpen={false}
              trigger={
                <HStack gap={3} vAlign="center" wrap="wrap">
                  <StackItem size="fill">
                    <Text weight="medium">{categoryLabel(category)}</Text>
                  </StackItem>
                  <HStack gap={1} wrap="wrap">
                    {PRESET_ORDER.map((role) => (
                      <Says key={role} who={roleLabel(role)} says={categorySays(set(role), actions)} />
                    ))}
                  </HStack>
                </HStack>
              }
            >
              <VStack gap={2}>
                <Divider />
                {actions.map((action) => (
                  <HStack key={action.id} gap={3} vAlign="center" wrap="wrap">
                    <StackItem size="fill">
                      <Text>{action.label}</Text>
                    </StackItem>
                    <HStack gap={1} wrap="wrap">
                      {PRESET_ORDER.map((role) => (
                        <Says key={role} who={roleLabel(role)} says={presetSays(set(role), action)} />
                      ))}
                    </HStack>
                  </HStack>
                ))}
              </VStack>
            </Collapsible>
          </Card>
        );
      })}
    </VStack>
  );
}

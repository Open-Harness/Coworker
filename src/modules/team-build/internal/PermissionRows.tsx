import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Collapsible } from "@astryxdesign/core/Collapsible";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Layout";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { Text } from "@astryxdesign/core/Text";
import type { ActionRow, Permission, PermissionsData, Settings } from "../types.ts";
import { categoryLabel, PERMISSIONS } from "./words.ts";

/** What a manager's own settings say, a category's and an action's: the draft being edited. */
export interface Own {
  readonly categories: Settings;
  readonly actions: Settings;
}

const isPermission = (value: string): value is Permission => PERMISSIONS.some((one) => one.value === value);

export const effectiveOf = (own: Own, row: ActionRow): Permission => own.actions[row.id] ?? own.categories[row.category] ?? row.default;

function Choice({
  label,
  value,
  isDisabled,
  onChange,
}: {
  readonly label: string;
  readonly value: Permission;
  readonly isDisabled: boolean;
  readonly onChange: (value: Permission) => void;
}) {
  return (
    <SegmentedControl
      label={label}
      value={value}
      size="sm"
      isDisabled={isDisabled}
      onChange={(next) => isPermission(next) && onChange(next)}
    >
      {PERMISSIONS.map(({ value: one, label: words }) => (
        <SegmentedControlItem key={one} value={one} label={words} />
      ))}
    </SegmentedControl>
  );
}

const without = (settings: Settings, key: string): Settings =>
  Object.fromEntries(Object.entries(settings).filter(([name]) => name !== key));

/** One category: its own default, and each action in it, which can differ. */
export function CategoryGroup({
  category,
  rows,
  data,
  own,
  canEdit,
  onChange,
}: {
  readonly category: string;
  readonly rows: readonly ActionRow[];
  readonly data: PermissionsData;
  readonly own: Own;
  readonly canEdit: boolean;
  readonly onChange: (own: Own) => void;
}) {
  const asks = rows.filter((row) => effectiveOf(own, row) === "ask").length;
  const categoryValue = own.categories[category] ?? data.categoryDefaults[category] ?? "off";
  return (
    <Card padding={3}>
      <Collapsible
        defaultIsOpen={false}
        trigger={
          <HStack gap={2} vAlign="center" wrap="wrap">
            <Text weight="semibold">{categoryLabel(category)}</Text>
            <Text color="secondary">{`${rows.length} actions${asks === 0 ? "" : ` · ${asks} set to Ask`}`}</Text>
          </HStack>
        }
      >
        <VStack gap={3} paddingBlock={3}>
          <HStack gap={3} vAlign="center" wrap="wrap">
            <StackItem size="fill">
              <Text type="supporting">{`Default for ${categoryLabel(category)}`}</Text>
            </StackItem>
            <Choice
              label={`${categoryLabel(category)}, default`}
              value={categoryValue}
              isDisabled={!canEdit}
              onChange={(value) => onChange({ ...own, categories: { ...own.categories, [category]: value } })}
            />
          </HStack>
          {rows.map((row) => {
            const isOwn = own.actions[row.id] !== undefined;
            return (
              <HStack key={row.id} gap={3} vAlign="center" wrap="wrap">
                <StackItem size="fill">
                  <VStack gap={0}>
                    <Text>{row.label}</Text>
                    <Text type="supporting">{isOwn ? `${row.id} · set here` : row.id}</Text>
                  </VStack>
                </StackItem>
                {isOwn && canEdit && (
                  <Button
                    label="Follow the category"
                    size="sm"
                    variant="ghost"
                    aria-label={`${row.label}: follow the category`}
                    onClick={() => onChange({ ...own, actions: without(own.actions, row.id) })}
                  />
                )}
                <Choice
                  label={row.label}
                  value={effectiveOf(own, row)}
                  isDisabled={!canEdit}
                  onChange={(value) => onChange({ ...own, actions: { ...own.actions, [row.id]: value } })}
                />
              </HStack>
            );
          })}
        </VStack>
      </Collapsible>
    </Card>
  );
}

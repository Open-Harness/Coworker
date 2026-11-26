import { useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Layout";
import { NumberInput } from "@astryxdesign/core/NumberInput";
import { Selector } from "@astryxdesign/core/Selector";
import { Text } from "@astryxdesign/core/Text";
import type { Loaded } from "~/modules/team-core/types.ts";
import type { BudgetData, UsageData } from "../types.ts";
import { SaveBar } from "./SaveBar.tsx";
import { useUnsaved } from "./Unsaved.tsx";
import { useDraft } from "./use-draft.ts";
import { useSaving } from "./use-saving.ts";
import { hours } from "./words.ts";

type Manager = UsageData["managers"][number];

const WHEN = [
  { value: "tell", label: "Keep going and tell its owner" },
  { value: "stop", label: "Stop its sandboxes" },
] as const;
/** What a new budget starts as. */
const FIRST: BudgetData = { hours: 10, whenReached: "tell" };

/** One manager's sandbox time, and the budget on it. It is saved with its own button, or taken away. */
export function BudgetRow({
  manager,
  onBudget,
}: {
  readonly manager: Manager;
  readonly onBudget: (managerId: string, budget: BudgetData | null) => Promise<Loaded<true>>;
}) {
  const { budget } = manager;
  const { value, change, isDirty, discard } = useDraft(budget ?? FIRST);
  const saver = useSaving();
  const [isSetting, setIsSetting] = useState(false);
  useUnsaved(isDirty);
  const saveAs = (next: BudgetData | null) => async () => void (await saver.run(onBudget(manager.managerId, next)));
  return (
    <Card padding={4}>
      <VStack gap={3}>
        <HStack gap={3} vAlign="center" wrap="wrap">
          <StackItem size="fill">
            <Text weight="medium">{manager.name}</Text>
          </StackItem>
          <Text color="secondary">{`${hours(manager.sandboxHours)} of sandbox · ${manager.runs} ${manager.runs === 1 ? "run" : "runs"}`}</Text>
        </HStack>
        {budget === null && !isSetting ? (
          <HStack gap={3} vAlign="center" wrap="wrap">
            <Text color="secondary">No budget</Text>
            <Button label={`Set a budget for ${manager.name}`} size="sm" onClick={() => setIsSetting(true)} />
          </HStack>
        ) : (
          <VStack gap={3}>
            <HStack gap={3} wrap="wrap" vAlign="end">
              <NumberInput
                label={`${manager.name}'s sandbox hours`}
                value={value.hours}
                onChange={(next) => change({ hours: next ?? 0 })}
                min={1}
                units="hours"
                width={160}
              />
              <Selector
                label="When it is reached"
                width={280}
                options={[...WHEN]}
                value={value.whenReached}
                onChange={(next) => change({ whenReached: next === "stop" ? "stop" : "tell" })}
              />
            </HStack>
            <SaveBar
              status={saver.status}
              isDirty={isDirty || budget === null}
              onSave={saveAs(value)}
              onDiscard={() => (budget === null ? setIsSetting(false) : discard())}
              label="Save budget"
            />
            {budget !== null && (
              <HStack>
                <Button label={`Remove ${manager.name}'s budget`} variant="ghost" size="sm" clickAction={saveAs(null)} />
              </HStack>
            )}
          </VStack>
        )}
      </VStack>
    </Card>
  );
}

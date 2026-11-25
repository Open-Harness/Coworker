import { useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { FormLayout } from "@astryxdesign/core/FormLayout";
import { HStack, VStack } from "@astryxdesign/core/Layout";
import { List, ListItem } from "@astryxdesign/core/List";
import { NumberInput } from "@astryxdesign/core/NumberInput";
import { ProgressBar } from "@astryxdesign/core/ProgressBar";
import { Text } from "@astryxdesign/core/Text";
import { TextArea } from "@astryxdesign/core/TextArea";
import { Timestamp } from "@astryxdesign/core/Timestamp";
import { LIMITS } from "~/modules/protocol/service.ts";
import type { ScheduleListProps, SettingsFormProps, UsageReportProps } from "../types.ts";
import { ModelControls } from "./ModelControls.tsx";

const dollars = (amount: number): string =>
  amount.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: amount < 1 ? 4 : 2 });

/** What every new chat of a workspace starts with. */
export function SettingsForm({ settings, models, onSave }: SettingsFormProps) {
  const [instructions, setInstructions] = useState(settings.instructions);
  const [budget, setBudget] = useState<number | null>(settings.budgetUsd ?? null);
  const [maxTurns, setMaxTurns] = useState(settings.maxTurns);
  return (
    <VStack gap={4}>
      <HStack gap={2} vAlign="center">
        <Text type="label">New chats use</Text>
        <ModelControls
          models={models}
          thinkingLevel={settings.thinkingLevel}
          onConfigure={onSave}
          {...(settings.model === undefined ? {} : { model: settings.model })}
        />
      </HStack>
      <FormLayout>
        <TextArea
          label="Instructions"
          description="Given to the assistant in every chat of this workspace."
          value={instructions}
          onChange={setInstructions}
          maxLength={LIMITS.instructions}
          rows={6}
          width="100%"
        />
        <NumberInput
          label="Budget"
          description="New prompts are refused once the workspace has spent this much. Empty: no limit."
          value={budget}
          onChange={(value: number | null) => setBudget(value)}
          min={0}
          units="USD"
          hasClear
        />
        <NumberInput
          label="Tool rounds per answer"
          description="The assistant stops after this many rounds of tool use."
          value={maxTurns}
          onChange={setMaxTurns}
          min={1}
          max={200}
          isIntegerOnly
        />
      </FormLayout>
      <HStack hAlign="end">
        <Button label="Save" variant="primary" onClick={() => onSave({ instructions, budgetUsd: budget, maxTurns })} />
      </HStack>
    </VStack>
  );
}

/** What a workspace has spent. */
export function UsageReport({ usage, budgetUsd }: UsageReportProps) {
  return (
    <VStack gap={3}>
      {budgetUsd === undefined ? (
        <Text>{`${dollars(usage.costUsd)} so far`}</Text>
      ) : (
        <ProgressBar
          label="Budget used"
          value={usage.costUsd}
          max={budgetUsd}
          hasValueLabel
          formatValueLabel={() => `${dollars(usage.costUsd)} of ${dollars(budgetUsd)}`}
          variant={usage.costUsd >= budgetUsd ? "error" : "accent"}
        />
      )}
      <List hasDividers edge="flush">
        {usage.models.map(({ model, costUsd, tokens }) => (
          <ListItem
            key={model}
            label={model}
            description={`${tokens.toLocaleString()} tokens`}
            endContent={<Text hasTabularNumbers>{dollars(costUsd)}</Text>}
          />
        ))}
      </List>
    </VStack>
  );
}

/** What will happen later, by itself. */
export function ScheduleList({ schedules, chatTitle, chatHref, onCancel }: ScheduleListProps) {
  if (schedules.length === 0) {
    return <EmptyState title="Nothing scheduled" description="Ask the assistant to do something later." isCompact />;
  }
  return (
    <List hasDividers edge="flush">
      {schedules.map(({ taskId, chatId, instruction, runAt, repeats }) => (
        <ListItem
          key={taskId}
          label={instruction}
          description={[chatTitle(chatId), repeats].filter(Boolean).join(" · ")}
          href={chatHref(chatId)}
          endContent={
            <HStack gap={2} vAlign="center">
              <Timestamp value={runAt / 1000} format="date_time" />
              <Button label="Cancel" size="sm" onClick={() => onCancel(taskId)} />
            </HStack>
          }
        />
      ))}
    </List>
  );
}

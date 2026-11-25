import { useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Grid } from "@astryxdesign/core/Grid";
import { VStack } from "@astryxdesign/core/Layout";
import { SelectableCard } from "@astryxdesign/core/SelectableCard";
import { Text } from "@astryxdesign/core/Text";
import type { StepProps } from "../types.ts";
import { OWN, type Picked, TEMPLATES } from "./words.ts";
import { Wizard } from "./Wizard.tsx";

const CHOICES: readonly { readonly value: Picked; readonly label: string; readonly description: string; readonly view: string }[] = [
  ...TEMPLATES,
  { value: OWN, label: "Describe your own", description: "Tell it what to do in a sentence.", view: "Starts on a Kanban board" },
];

/** What the first manager is for. Its name and mission come next. */
export function PickManager({ frame, next }: StepProps) {
  const [picked, setPicked] = useState<Picked>("kanban");
  return (
    <Wizard
      frame={frame}
      title="What should your first manager do?"
      description="Each starts with its own board and rules. You can change all of it, and make more managers later."
      action={<Button label="Continue" variant="primary" onClick={() => next(picked === OWN ? {} : { template: picked })} />}
    >
      <Grid columns={{ minWidth: 260 }} gap={3}>
        {CHOICES.map(({ value, label, description, view }) => (
          <SelectableCard key={value} label={label} isSelected={picked === value} onChange={() => setPicked(value)} padding={4}>
            <VStack gap={2}>
              <Text weight="semibold">{label}</Text>
              <Text color="secondary">{description}</Text>
              <Text type="supporting">{view}</Text>
            </VStack>
          </SelectableCard>
        ))}
      </Grid>
    </Wizard>
  );
}

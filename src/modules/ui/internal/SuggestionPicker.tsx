import { useState } from "react";
import { CodeBracketIcon, LightBulbIcon, MagnifyingGlassIcon, PencilSquareIcon } from "@heroicons/react/24/outline";
import { ClickableCard } from "@astryxdesign/core/ClickableCard";
import { Grid } from "@astryxdesign/core/Grid";
import { Icon } from "@astryxdesign/core/Icon";
import { VStack } from "@astryxdesign/core/Layout";
import { Heading, Text } from "@astryxdesign/core/Text";
import { ToggleButton, ToggleButtonGroup } from "@astryxdesign/core/ToggleButton";
import type { SuggestionPickerProps } from "../types.ts";

const ICONS = {
  write: PencilSquareIcon,
  code: CodeBracketIcon,
  research: MagnifyingGlassIcon,
  plan: LightBulbIcon,
} as const;

/** Ways to begin, by what you want to do. */
export function SuggestionPicker({ categories, onPick }: SuggestionPickerProps) {
  const [picked, setPicked] = useState<string | null>(null);
  const category = categories.find(({ key }) => key === picked);
  return (
    <VStack gap={6}>
      <ToggleButtonGroup label="Category" value={picked} onChange={setPicked} size="lg">
        {categories.map(({ key, label, icon }) => (
          <ToggleButton key={key} value={key} label={label} icon={<Icon icon={ICONS[icon]} size="sm" />} />
        ))}
      </ToggleButtonGroup>
      {category !== undefined && (
        <Grid columns={{ minWidth: 280 }} gap={3}>
          {category.suggestions.map(({ heading, body, prompt }) => (
            <ClickableCard key={heading} label={heading} variant="muted" padding={3} onClick={() => onPick(prompt)}>
              <VStack gap={0.5}>
                <Heading level={4}>{heading}</Heading>
                <Text type="body" color="secondary" size="xsm">
                  {body}
                </Text>
              </VStack>
            </ClickableCard>
          ))}
        </Grid>
      )}
    </VStack>
  );
}

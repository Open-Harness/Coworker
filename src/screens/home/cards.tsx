// astryx-template: ai-chat-landing
import { AcademicCapIcon, AdjustmentsHorizontalIcon, BoltIcon, MagnifyingGlassIcon as SearchIcon } from "@heroicons/react/24/outline";
import { ClickableCard } from "@astryxdesign/core/ClickableCard";
import { Grid } from "@astryxdesign/core/Grid";
import { Icon } from "@astryxdesign/core/Icon";
import { VStack } from "@astryxdesign/core/Layout";
import { ToggleButton, ToggleButtonGroup } from "@astryxdesign/core/ToggleButton";
import { Heading, Text } from "@astryxdesign/core/Text";
import type { HomeView } from "~/modules/views-workspace/types.ts";

type Suggestion = HomeView["suggestions"][number];
type Category = Suggestion["category"];

/** The four groups of cards under the composer. */
const CATEGORIES = [
  { key: "set", label: "Set up", icon: AdjustmentsHorizontalIcon },
  { key: "know", label: "Find out", icon: SearchIcon },
  { key: "do", label: "Get done", icon: BoltIcon },
  { key: "learn", label: "Show me how", icon: AcademicCapIcon },
] as const;
const inset = { paddingInline: "var(--spacing-3)" } as const;

interface Props {
  readonly suggestions: readonly Suggestion[];
  readonly category: Category | null;
  readonly onCategory: (category: Category | null) => void;
  readonly onPick: (suggestion: Suggestion) => void;
}

/** Category filters, and the cards of the one that is chosen. */
export function Cards({ suggestions, category, onCategory, onPick }: Props) {
  const shown = suggestions.filter((one) => one.category === category);
  return (
    <VStack gap={6} style={inset}>
      <ToggleButtonGroup
        label="Category"
        value={category}
        onChange={(value) => onCategory(CATEGORIES.find((one) => one.key === value)?.key ?? null)}
        size="lg"
      >
        {CATEGORIES.map((one) => (
          <ToggleButton key={one.key} value={one.key} label={one.label} icon={<Icon icon={one.icon} size="sm" />} />
        ))}
      </ToggleButtonGroup>
      {category === null ? null : (
        <Grid columns={{ minWidth: 280 }} gap={3}>
          {shown.map((one) => (
            <ClickableCard key={one.id} label={one.heading} variant="muted" padding={3} onClick={() => onPick(one)}>
              <VStack gap={0.5}>
                <Heading level={4}>{one.heading}</Heading>
                <Text type="body" color="secondary" size="xsm">
                  {one.about}
                </Text>
              </VStack>
            </ClickableCard>
          ))}
        </Grid>
      )}
    </VStack>
  );
}

// astryx-template: dashboard-scorecard
import { VStack, HStack, StackItem } from "@astryxdesign/core/Layout";
import { Text, Heading } from "@astryxdesign/core/Text";
import { Link } from "@astryxdesign/core/Link";
import { ProgressBar } from "@astryxdesign/core/ProgressBar";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { useHref } from "~/modules/page/service.ts";
import type { OverviewView } from "~/modules/views-workspace/types.ts";
import { goalRag, type Rag } from "./figures.ts";

type Goal = OverviewView["objectives"][number];

const PROGRESS: Record<Rag, "success" | "warning" | "error"> = { green: "success", amber: "warning", red: "error" };
const DOT = {
  working: { variant: "success", label: "Working" },
  "needs you": { variant: "warning", label: "Waits for you" },
  stuck: { variant: "error", label: "Stuck" },
  idle: { variant: "neutral", label: "Idle" },
  paused: { variant: "neutral", label: "Paused" },
} as const;

/** Where its number stands, said by what the objective counts. */
const valueOf = (goal: Goal): string => {
  if (goal.standing._tag !== "Read") return goal.standing.why;
  const { now, aim } = goal.standing;
  switch (goal.unit) {
    case "hours":
      return `${now} h now`;
    case "steps":
      return `${now} / ${aim} steps`;
    case "of":
      return `${now} of ${aim}`;
    case "count":
      return `${now} / ${aim}`;
  }
};

/** Furthest from its line first. */
export const byDistance = (goals: readonly Goal[]): readonly Goal[] =>
  [...goals].sort((a, b) => a.progress / (a.shouldBe || 1) - b.progress / (b.shouldBe || 1) || a.name.localeCompare(b.name));

/** One objective, and the manager that carries it. It opens the manager. */
export function GoalRow({ goal }: { readonly goal: Goal }) {
  const href = useHref();
  const [percent, line] = [Math.round(goal.progress * 100), Math.round(goal.shouldBe * 100)];
  const rag = goalRag(percent, line);
  return (
    <VStack gap={2}>
      <HStack hAlign="between" vAlign="center" gap={3}>
        <StackItem size="fill">
          <Heading level={4} accessibilityLevel={3}>
            <Link href={href(goal.manager === "root" ? "/managers" : `/m/${goal.manager}`)} weight="bold">
              {goal.says}
            </Link>
          </Heading>
        </StackItem>
        <Text type="supporting" color="secondary">
          {valueOf(goal)}
        </Text>
      </HStack>
      <ProgressBar value={percent} max={100} variant={PROGRESS[rag]} label={`${goal.name}: ${goal.says}`} isLabelHidden />
      <HStack hAlign="between" vAlign="center" gap={4} wrap="wrap">
        <HStack gap={2} vAlign="center">
          <StatusDot variant={DOT[goal.is].variant} label={DOT[goal.is].label} />
          <Text type="supporting" color="secondary">
            {goal.name}
          </Text>
        </HStack>
        <Text type="supporting" color="secondary">
          {`By now it should be ${line}%, and is ${percent}%`}
        </Text>
      </HStack>
    </VStack>
  );
}

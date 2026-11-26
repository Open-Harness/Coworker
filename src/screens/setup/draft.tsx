import { VStack } from "@astryxdesign/core/Layout";
import { List, ListItem } from "@astryxdesign/core/List";
import { MetadataList, MetadataListItem } from "@astryxdesign/core/MetadataList";
import { Text } from "@astryxdesign/core/Text";
import type { Trigger } from "~/modules/playbook/types.ts";
import type { SetUpView } from "~/modules/views-manager/types.ts";
import { dayOf } from "../connectors/when.ts";

const small = (text: string) => (
  <Text type="supporting" color="secondary">
    {text}
  </Text>
);

const plural = (n: number, word: string): string => `${n} ${word}${n === 1 ? "" : "s"}`;

/** What the triggers of the draft are, by how they start: "2 crons, 2 events, 1 wait, asked". */
const triggersLine = (triggers: readonly Trigger[]): string => {
  const count = (by: Trigger["by"]) => triggers.filter((t) => t.by === by).length;
  return [plural(count("cron"), "cron"), plural(count("event"), "event"), plural(count("wait"), "wait"), count("asked") > 0 ? "asked" : ""]
    .filter((part) => !part.startsWith("0 ") && part !== "")
    .join(", ");
};

/** The draft, part by part, and what it was tried on: nothing is made yet. */
export function Draft({ view, owner, zone }: { view: SetUpView; owner: string; zone: string }) {
  const { tried, draft, walk } = view;
  // Once there is a draft, what it holds is read from it; before that, from what the walk said of it so far.
  const says = (part: string, was: string): string =>
    draft === null
      ? was
      : part === "Triggers"
        ? triggersLine(draft.playbook.triggers)
        : part === "Evals"
          ? `${draft.evals.length} measures, ${draft.cases.total} cases`
          : was;
  const because = Object.values(draft?.because ?? {});
  const count = (why: "you said" | "looked up" | "my idea") => because.filter((b) => b.why === why).length;
  const judged = walk.cases.filter((c) => c.said !== null).length;
  return (
    <VStack gap={5}>
      <MetadataList columns="single" label={{ position: "start", width: 104 }}>
        {view.sofar.map((p) => (
          <MetadataListItem key={p.part} label={p.part}>
            {says(p.part, p.says)}
          </MetadataListItem>
        ))}
      </MetadataList>
      <List density="balanced" hasDividers>
        {tried === null ? null : (
          <ListItem
            label={`Tried on ${dayOf(tried.from, zone)} to ${dayOf(tried.to, zone)}, sending nothing`}
            description={small(
              `${tried.came} came in. ${tried.took} taken on, ${tried.asked} asked of ${owner}, ${tried.watched} watched, ${tried.left} left alone. $${tried.cost}`,
            )}
          />
        )}
        <ListItem
          label={`${count("you said")} lines you said, ${count("looked up")} I looked up, ${count("my idea")} are my idea`}
          description={small("My ideas are marked. Those are the ones to read first")}
        />
        <ListItem
          label={`${walk.cases.length} cases to judge. ${owner} did ${judged}`}
          description={small("Right or wrong, about 3 minutes. They are how it will be measured first")}
        />
      </List>
    </VStack>
  );
}

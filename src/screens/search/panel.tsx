// astryx-template: detail-page
import { Collapsible } from "@astryxdesign/core/Collapsible";
import { VStack } from "@astryxdesign/core/Layout";
import { Link } from "@astryxdesign/core/Link";
import { MetadataList, MetadataListItem } from "@astryxdesign/core/MetadataList";
import { ProgressBar } from "@astryxdesign/core/ProgressBar";
import { Heading, Text } from "@astryxdesign/core/Text";
import { useHref } from "~/modules/page/service.ts";
import type { TriggerView } from "~/modules/views-manager/types.ts";
import { mayOf } from "../intake/came.ts";
import { cadence, say } from "../manager-frame/words.ts";

const COUNTS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"] as const;

/** What the trigger is: when and what, why it runs when it does, and what it has spent. */
export function PanelContent({
  view,
  manager,
  sectionLevel = 2,
}: {
  readonly view: TriggerView;
  readonly manager: string;
  readonly sectionLevel?: 2 | 3;
}) {
  const href = useHref();
  const { trigger } = view.row;
  const title = (text: string) => (
    <Heading level={4} accessibilityLevel={sectionLevel}>
      {text}
    </Heading>
  );
  const when = trigger.by === "cron" ? cadence(trigger.when.cron) : null;
  const percent = view.spent.of === 0 ? 0 : Math.round((view.spent.month / view.spent.of) * 100);
  const looks = view.looksAt;
  return (
    <VStack gap={4}>
      <Collapsible trigger={title("When and what")}>
        <MetadataList>
          {when === null ? null : <MetadataListItem label="When">{when}</MetadataListItem>}
          <MetadataListItem label="Who">{view.agentName}</MetadataListItem>
          {looks === null ? null : <MetadataListItem label="Looks at">{`${looks.says}, ${looks.count} ${looks.noun}`}</MetadataListItem>}
          {trigger.atMost === "no limit" ? null : (
            <MetadataListItem label="At most">{`${trigger.atMost.count} a ${trigger.atMost.a}`}</MetadataListItem>
          )}
          <MetadataListItem label="May">{mayOf(view.may)}</MetadataListItem>
          {view.kindName === null ? null : (
            <MetadataListItem label="Becomes">
              <Link href={href(`/m/${manager}/playbook/workflow`)}>{view.kindName}</Link>
            </MetadataListItem>
          )}
        </MetadataList>
      </Collapsible>
      {view.tried.length === 0 ? null : (
        <Collapsible
          trigger={title(
            when === null ? "Why it runs when it does" : `Why ${when.replace(/^\w/u, (one) => one.toLowerCase()).replace(", ", " at ")}`,
          )}
        >
          <VStack gap={3}>
            <Text type="body">{`Juno ran it over ${view.triedDays} past days, ${COUNTS[view.tried.length] ?? view.tried.length} ways.`}</Text>
            <MetadataList>
              {view.tried.map((one) => (
                <MetadataListItem key={one.when} label={one.when}>
                  {one.says}
                </MetadataListItem>
              ))}
            </MetadataList>
          </VStack>
        </Collapsible>
      )}
      <Collapsible trigger={title("Spent this month")}>
        <VStack gap={1}>
          <ProgressBar label="Spent this month" value={percent} isLabelHidden />
          <Text type="body">{`${say("dollars", view.spent.month)} of ${say("dollars", view.spent.of)}. It stops at the limit and says so once.`}</Text>
        </VStack>
      </Collapsible>
    </VStack>
  );
}

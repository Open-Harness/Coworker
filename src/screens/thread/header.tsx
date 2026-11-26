// astryx-template: ai-chat
import { Divider } from "@astryxdesign/core/Divider";
import { Icon } from "@astryxdesign/core/Icon";
import { HStack, LayoutHeader } from "@astryxdesign/core/Layout";
import { Link } from "@astryxdesign/core/Link";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { Text } from "@astryxdesign/core/Text";
import { rtlStyles } from "@astryxdesign/core/utils";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { useClock, useHref } from "~/modules/page/service.ts";
import type { ThreadPage } from "~/modules/views-manager/types.ts";
import { dayMonth, lasted, say, useZone } from "../manager-frame/words.ts";

const STATE = {
  working: { variant: "success", label: "Working" },
  waits: { variant: "warning", label: "Waiting for a person" },
  ended: { variant: "neutral", label: "Done" },
} as const;

/** One compact row above the transcript: where it belongs, what it is, how it is going. */
export function ThreadHeader({ page, title }: { readonly page: ThreadPage; readonly title: string }) {
  const [href, clock, zone] = [useHref(), useClock(), useZone()];
  const { thread } = page;
  const state = STATE[thread.state];
  const facts = [
    `Model ${thread.model}`,
    `Version ${thread.version}`,
    `Started ${dayMonth(thread.started, zone)}, ${clock.time(thread.started)}`,
    `${lasted(thread.state === "ended" ? thread.took : clock.now() - thread.started)}${thread.state === "ended" ? "" : " so far"}`,
    say("dollars", thread.cost),
  ];
  return (
    <LayoutHeader padding={3} hasDivider>
      <HStack gap={3} vAlign="center" wrap="wrap">
        {page.work === null ? null : (
          <>
            <Link href={href(`/m/${page.head.id}/work/${page.work.id}`)} type="supporting" color="secondary">
              <HStack as="span" gap={1} vAlign="center">
                <Icon icon={ArrowLeftIcon} size="sm" xstyle={rtlStyles.mirror} />
                {page.work.id}
              </HStack>
            </Link>
            <Divider orientation="vertical" />
          </>
        )}
        <Text type="body" weight="semibold">
          {title}
        </Text>
        <HStack gap={1.5} vAlign="center">
          <StatusDot variant={state.variant} label={state.label} isPulsing={thread.state === "working"} />
          <Text type="supporting" color="secondary">
            {state.label}
          </Text>
        </HStack>
        <Text type="supporting" color="secondary">
          {facts.join(" · ")}
        </Text>
      </HStack>
    </LayoutHeader>
  );
}

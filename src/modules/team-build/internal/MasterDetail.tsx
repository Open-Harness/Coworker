import type { ReactNode } from "react";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { Button } from "@astryxdesign/core/Button";
import { Icon } from "@astryxdesign/core/Icon";
import { HStack, Stack, StackItem, VStack } from "@astryxdesign/core/Layout";
import { useNarrow } from "~/modules/team-core/service.ts";
import { Page } from "~/modules/ui/service.ts";

/** A list on one side and one of its things on the other. A phone shows one at a time. */
export function MasterDetail({
  title,
  description,
  list,
  detail,
  backHref,
  backLabel,
  endContent,
}: {
  readonly title: string;
  readonly description: string;
  readonly list: ReactNode;
  /** Absent: nothing is open. */
  readonly detail: ReactNode;
  readonly backHref: string;
  readonly backLabel: string;
  readonly endContent?: ReactNode;
}) {
  const isNarrow = useNarrow();
  const isOpen = detail !== undefined && detail !== false && detail !== null;
  return (
    <Page width="wide" title={title} description={description} {...(endContent === undefined ? {} : { endContent })}>
      {isNarrow ? (
        isOpen ? (
          <VStack gap={4}>
            <HStack>
              <Button label={backLabel} size="sm" href={backHref} icon={<Icon icon={ArrowLeftIcon} size="sm" />} />
            </HStack>
            {detail}
          </VStack>
        ) : (
          list
        )
      ) : (
        <Stack direction="horizontal" gap={6} vAlign="start">
          <StackItem size="static">
            <VStack width={300}>{list}</VStack>
          </StackItem>
          <StackItem size="fill">{detail}</StackItem>
        </Stack>
      )}
    </Page>
  );
}

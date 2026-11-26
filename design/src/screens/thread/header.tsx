import { HStack } from "@astryxdesign/core/Layout";
import { LayoutHeader } from "@astryxdesign/core/Layout";
import { Divider } from "@astryxdesign/core/Divider";
import { Icon } from "@astryxdesign/core/Icon";
import { Link } from "@astryxdesign/core/Link";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { Text } from "@astryxdesign/core/Text";
import { rtlStyles } from "@astryxdesign/core/utils";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { TRACE } from "../../world";

/** One compact row above the transcript: where it belongs, what it is, how it is going. */
export function ThreadHeader() {
  const facts = [`Model ${TRACE.model}`, `Version ${TRACE.version}`, `Started ${TRACE.started}`, `${TRACE.took} so far`, TRACE.cost];
  return (
    <LayoutHeader padding={3} hasDivider>
      <HStack gap={3} vAlign="center" wrap="wrap">
        <Link href="#task" type="supporting" color="secondary">
          <HStack as="span" gap={1} vAlign="center">
            <Icon icon={ArrowLeftIcon} size="sm" xstyle={rtlStyles.mirror} />
            {TRACE.task}
          </HStack>
        </Link>
        <Divider orientation="vertical" />
        <Text type="body" weight="semibold">{TRACE.role}</Text>
        <HStack gap={1.5} vAlign="center"><StatusDot variant="success" label="Working" isPulsing /><Text type="supporting" color="secondary">Working</Text></HStack>
        <Text type="supporting" color="secondary">{facts.join(" · ")}</Text>
      </HStack>
    </LayoutHeader>
  );
}

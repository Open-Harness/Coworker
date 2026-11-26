import { HStack, StackItem } from "@astryxdesign/core/Layout";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Icon } from "@astryxdesign/core/Icon";
import { Text } from "@astryxdesign/core/Text";
import { useToast } from "@astryxdesign/core/Toast";
import { useImperativeAlertDialog } from "@astryxdesign/core/AlertDialog";
import { ChatBubbleLeftRightIcon, StopIcon } from "@heroicons/react/24/outline";
import { go } from "../../shell";
import { TRACE } from "../../world";

/** Where the composer would be. A thread is not written to: you talk to its manager. */
export function NoComposer() {
  const showToast = useToast();
  const confirm = useImperativeAlertDialog();
  return (
    <Card variant="muted" padding={3}>
      <HStack gap={3} vAlign="center" wrap="wrap">
        <StackItem size="fill"><Text type="body">You don’t write to a thread. Ask Juno about it.</Text></StackItem>
        <HStack gap={2} wrap="wrap">
          <Button label="Ask Juno" variant="primary" icon={<Icon icon={ChatBubbleLeftRightIcon} size="sm" />} onClick={() => go("home")} />
          <Button
            label="Stop this thread"
            variant="secondary"
            icon={<Icon icon={StopIcon} size="sm" />}
            onClick={() =>
              confirm.show({
                title: `Stop ${TRACE.id}?`,
                description: `${TRACE.manager} is told, and decides what happens to the work so far.`,
                actionLabel: "Stop it",
                onAction: () => { confirm.hide(); showToast({ body: `${TRACE.id} is asked to stop. ${TRACE.manager} is told.`, uniqueID: "stop" }); },
              })
            }
          />
        </HStack>
      </HStack>
      {confirm.element}
    </Card>
  );
}

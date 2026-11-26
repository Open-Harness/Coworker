// astryx-template: ai-chat
import { useImperativeAlertDialog } from "@astryxdesign/core/AlertDialog";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Icon } from "@astryxdesign/core/Icon";
import { HStack, StackItem } from "@astryxdesign/core/Layout";
import { Text } from "@astryxdesign/core/Text";
import { useToast } from "@astryxdesign/core/Toast";
import { ChatBubbleLeftRightIcon, StopIcon } from "@heroicons/react/24/outline";
import { useGo } from "~/modules/page/service.ts";

/** Where the composer would be. A thread is not written to: you talk to its manager. */
export function NoComposer({ id, manager, juno }: { readonly id: string; readonly manager: string; readonly juno: string }) {
  const [showToast, confirm, go] = [useToast(), useImperativeAlertDialog(), useGo()];
  return (
    <Card variant="muted" padding={3}>
      <HStack gap={3} vAlign="center" wrap="wrap">
        <StackItem size="fill">
          <Text type="body">{`You don’t write to a thread. Ask ${juno} about it.`}</Text>
        </StackItem>
        <HStack gap={2} wrap="wrap">
          <Button
            label={`Ask ${juno}`}
            variant="primary"
            icon={<Icon icon={ChatBubbleLeftRightIcon} size="sm" />}
            onClick={() => go("/")}
          />
          <Button
            label="Stop this thread"
            variant="secondary"
            icon={<Icon icon={StopIcon} size="sm" />}
            onClick={() =>
              confirm.show({
                title: `Stop ${id}?`,
                description: `${manager} is told, and decides what happens to the work so far.`,
                actionLabel: "Stop it",
                onAction: () => {
                  confirm.hide();
                  showToast({ body: "Stopping a thread is not in this first set.", uniqueID: "stop" });
                },
              })
            }
          />
        </HStack>
      </HStack>
      {confirm.element}
    </Card>
  );
}

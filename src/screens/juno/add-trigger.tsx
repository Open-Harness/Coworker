import { useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { HStack, Layout, LayoutContent, LayoutFooter, VStack } from "@astryxdesign/core/Layout";
import { Selector } from "@astryxdesign/core/Selector";
import { TextArea } from "@astryxdesign/core/TextArea";
import { useRead } from "~/modules/page/service.ts";
import { useDoing } from "./act.ts";

/** Asks which manager and what the trigger is, and adds it with the doing that adds a trigger. */
export function AddTrigger({ isOpen, onClose }: { readonly isOpen: boolean; readonly onClose: () => void }) {
  const shell = useRead("/shell");
  const act = useDoing();
  const managers = shell._tag === "Ok" ? shell.value.tree : [];
  const [manager, setManager] = useState("");
  const [trigger, setTrigger] = useState("");
  const chosen = manager === "" ? (managers[0]?.id ?? "") : manager;
  const ready = chosen !== "" && trigger.trim() !== "";
  return (
    <Dialog isOpen={isOpen} onOpenChange={(open) => !open && onClose()} purpose="form" width={480}>
      {isOpen && (
        <Layout
          height="auto"
          header={<DialogHeader title="Add a trigger" hasDivider={false} onOpenChange={onClose} />}
          content={
            <LayoutContent>
              <VStack gap={3}>
                <Selector
                  label="Manager"
                  value={chosen}
                  onChange={(next) => next && setManager(next)}
                  options={managers.map((one) => ({ value: one.id, label: one.name }))}
                />
                <TextArea label="What makes it go" rows={3} value={trigger} onChange={(next: string) => setTrigger(next)} />
              </VStack>
            </LayoutContent>
          }
          footer={
            <LayoutFooter>
              <HStack gap={2} hAlign="end">
                <Button label="Cancel" variant="ghost" onClick={onClose} />
                <Button
                  label="Add trigger"
                  variant="primary"
                  isDisabled={!ready}
                  onClick={() => void act("trigger.add", { manager: chosen, trigger: trigger.trim() }).then((done) => done && onClose())}
                />
              </HStack>
            </LayoutFooter>
          }
        />
      )}
    </Dialog>
  );
}

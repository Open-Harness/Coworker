import { useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { CheckboxList, CheckboxListItem } from "@astryxdesign/core/CheckboxList";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { HStack, Layout, LayoutContent, LayoutFooter, VStack } from "@astryxdesign/core/Layout";
import { RadioList, RadioListItem } from "@astryxdesign/core/RadioList";
import { Selector } from "@astryxdesign/core/Selector";
import type { AgentRow, DeployedTo } from "~/modules/agent-config/types.ts";
import type { WorkspaceRow } from "~/modules/protocol/types.ts";

interface DeployDialogProps {
  readonly agent: AgentRow;
  readonly workspaces: readonly WorkspaceRow[];
  readonly onClose: () => void;
  readonly onDeploy: (version: number, to: DeployedTo) => void;
}

function DeployForm({ agent, workspaces, onClose, onDeploy }: DeployDialogProps) {
  const before = agent.deployment?.to ?? "all";
  const [version, setVersion] = useState(agent.version);
  const [scope, setScope] = useState(before === "all" ? "all" : "chosen");
  const [chosen, setChosen] = useState<string[]>(before === "all" ? [] : [...before]);
  const isIncomplete = scope === "chosen" && chosen.length === 0;
  return (
    <Layout
      height="auto"
      header={
        <DialogHeader
          title={`Deploy ${agent.config.name}`}
          subtitle="New chats use the version you deploy. Running chats keep theirs."
          hasDivider={false}
          onOpenChange={onClose}
        />
      }
      content={
        <LayoutContent>
          <VStack gap={4}>
            <Selector
              label="Version"
              options={agent.versions.map((saved) => ({
                value: String(saved.version),
                label: `Version ${saved.version}`,
                description: `Saved by ${saved.savedBy}`,
              }))}
              value={String(version)}
              onChange={(value) => setVersion(Number(value))}
            />
            <RadioList label="Where" value={scope} onChange={setScope}>
              <RadioListItem value="all" label="Every workspace" description="Also workspaces created later" />
              <RadioListItem value="chosen" label="Chosen workspaces" />
            </RadioList>
            {scope === "chosen" && (
              <CheckboxList label="Workspaces" value={chosen} onChange={setChosen}>
                {workspaces.map(({ id, name }) => (
                  <CheckboxListItem key={id} value={id} label={name} />
                ))}
              </CheckboxList>
            )}
          </VStack>
        </LayoutContent>
      }
      footer={
        <LayoutFooter>
          <HStack gap={2} hAlign="end">
            <Button label="Cancel" variant="ghost" onClick={onClose} />
            <Button
              label="Deploy"
              variant="primary"
              isDisabled={isIncomplete}
              onClick={() => onDeploy(version, scope === "all" ? "all" : chosen)}
            />
          </HStack>
        </LayoutFooter>
      }
    />
  );
}

/** Which version people get, and where. */
export function DeployDialog(props: Omit<DeployDialogProps, "agent"> & { readonly agent: AgentRow | undefined }) {
  const { agent, onClose } = props;
  return (
    <Dialog isOpen={agent !== undefined} onOpenChange={(open) => !open && onClose()} purpose="form" width={480}>
      {agent !== undefined && <DeployForm {...props} agent={agent} />}
    </Dialog>
  );
}

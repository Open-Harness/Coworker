import { useState } from "react";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { FormLayout } from "@astryxdesign/core/FormLayout";
import { HStack, Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { Selector } from "@astryxdesign/core/Selector";
import { TextInput } from "@astryxdesign/core/TextInput";
import type { Loaded } from "~/modules/team-core/types.ts";
import type { NewManager, Template } from "../types.ts";

const TEMPLATES: readonly { readonly value: Template; readonly label: string; readonly description: string }[] = [
  { value: "kanban", label: "Kanban", description: "Work moves through lanes" },
  { value: "incident", label: "Incident", description: "A console for what is on fire" },
  { value: "support", label: "Support", description: "An inbox of what people ask" },
  { value: "research", label: "Research", description: "Questions in, short reports out" },
];
const isTemplate = (value: string | null): value is Template => TEMPLATES.some((template) => template.value === value);

function Form({ onCreate, onClose }: { readonly onCreate: (input: NewManager) => Promise<Loaded<unknown>>; readonly onClose: () => void }) {
  const [name, setName] = useState("");
  const [template, setTemplate] = useState<Template>("kanban");
  const [failure, setFailure] = useState<string>();
  const create = async () => {
    const made = await onCreate({ name: name.trim(), template });
    setFailure(made._tag === "Failed" ? made.message : undefined);
  };
  return (
    <Layout
      height="auto"
      header={
        <DialogHeader
          title="New manager"
          subtitle="It gets a board, a mission and an email address."
          onOpenChange={onClose}
          hasDivider={false}
        />
      }
      content={
        <LayoutContent>
          <FormLayout>
            {failure !== undefined && <Banner status="error" title="The manager was not made" description={failure} />}
            <TextInput label="Name" value={name} onChange={setName} hasAutoFocus width="100%" />
            <Selector
              label="Template"
              options={[...TEMPLATES]}
              value={template}
              onChange={(value) => isTemplate(value) && setTemplate(value)}
              width="100%"
            />
          </FormLayout>
        </LayoutContent>
      }
      footer={
        <LayoutFooter>
          <HStack gap={2} hAlign="end">
            <Button label="Cancel" variant="ghost" onClick={onClose} />
            <Button label="Create manager" variant="primary" isDisabled={name.trim() === ""} clickAction={create} />
          </HStack>
        </LayoutFooter>
      }
    />
  );
}

export function NewManagerDialog({
  isOpen,
  onClose,
  onCreate,
}: {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onCreate: (input: NewManager) => Promise<Loaded<unknown>>;
}) {
  return (
    <Dialog isOpen={isOpen} onOpenChange={(open) => !open && onClose()} purpose="form" width={460}>
      {isOpen && <Form onCreate={onCreate} onClose={onClose} />}
    </Dialog>
  );
}

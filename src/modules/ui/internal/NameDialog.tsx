import { useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { HStack, Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { TextInput } from "@astryxdesign/core/TextInput";
import type { NameDialogProps } from "../types.ts";

function NameForm({ description, label, initialValue = "", submitLabel, maxLength, onClose, onSubmit, title }: NameDialogProps) {
  const [value, setValue] = useState(initialValue);
  const name = value.trim();
  const submit = () => {
    if (name !== "" && name.length <= maxLength) onSubmit(name);
  };
  return (
    <Layout
      height="auto"
      header={
        <DialogHeader
          title={title}
          hasDivider={false}
          {...(description === undefined ? {} : { subtitle: description })}
          {...(onClose === undefined ? {} : { onOpenChange: onClose })}
        />
      }
      content={
        <LayoutContent>
          <TextInput
            label={label}
            value={value}
            onChange={setValue}
            onEnter={submit}
            hasAutoFocus
            width="100%"
            {...(name.length > maxLength ? { status: { type: "error" as const, message: `Use at most ${maxLength} characters` } } : {})}
          />
        </LayoutContent>
      }
      footer={
        <LayoutFooter>
          <HStack gap={2} hAlign="end">
            {onClose !== undefined && <Button label="Cancel" variant="ghost" onClick={onClose} />}
            <Button label={submitLabel} variant="primary" isDisabled={name === "" || name.length > maxLength} onClick={submit} />
          </HStack>
        </LayoutFooter>
      }
    />
  );
}

/** Asks for one name: a person's, a workspace's, a chat's. */
export function NameDialog(props: NameDialogProps) {
  const { isOpen, onClose } = props;
  return (
    <Dialog isOpen={isOpen} onOpenChange={(open) => !open && onClose?.()} purpose={onClose === undefined ? "required" : "form"} width={420}>
      {isOpen && <NameForm {...props} />}
    </Dialog>
  );
}

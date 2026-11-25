import type { ReactNode } from "react";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { FormLayout } from "@astryxdesign/core/FormLayout";
import { HStack, Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";

/** A dialog with a form in it: fields, what went wrong, and one thing to do. */
export function FormDialog({
  isOpen,
  onClose,
  title,
  subtitle,
  failure,
  submitLabel,
  isReady,
  onSubmit,
  children,
  width = 480,
}: {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly title: string;
  readonly subtitle: string;
  readonly failure: string | undefined;
  readonly submitLabel: string;
  readonly isReady: boolean;
  readonly onSubmit: () => Promise<void>;
  readonly children: ReactNode;
  readonly width?: number;
}) {
  return (
    <Dialog isOpen={isOpen} onOpenChange={(open) => !open && onClose()} purpose="form" width={width}>
      <Layout
        height="auto"
        header={<DialogHeader title={title} subtitle={subtitle} onOpenChange={onClose} hasDivider={false} />}
        content={
          <LayoutContent>
            <FormLayout>
              {failure !== undefined && <Banner status="error" title={failure} />}
              {children}
            </FormLayout>
          </LayoutContent>
        }
        footer={
          <LayoutFooter>
            <HStack gap={2} hAlign="end">
              <Button label="Cancel" variant="ghost" onClick={onClose} />
              <Button label={submitLabel} variant="primary" isDisabled={!isReady} clickAction={onSubmit} />
            </HStack>
          </LayoutFooter>
        }
      />
    </Dialog>
  );
}

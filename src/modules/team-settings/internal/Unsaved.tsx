import { createContext, use, useEffect, useId } from "react";
import { AlertDialog } from "@astryxdesign/core/AlertDialog";

/** Screens say here whether they hold changes nobody saved; the page's route decides what that stops. */
const UnsavedContext = createContext<(owner: string, isDirty: boolean) => void>(() => undefined);
export const UnsavedProvider = UnsavedContext.Provider;

/** Tells the page that this form holds unsaved changes while `isDirty`. */
export function useUnsaved(isDirty: boolean): void {
  const report = use(UnsavedContext);
  const owner = useId();
  useEffect(() => {
    report(owner, isDirty);
    return () => report(owner, false);
  }, [report, owner, isDirty]);
}

/** Asks whether to leave a page that holds changes nobody saved. */
export function LeaveDialog({
  isOpen,
  onStay,
  onLeave,
}: {
  readonly isOpen: boolean;
  readonly onStay: () => void;
  readonly onLeave: () => void;
}) {
  return (
    <AlertDialog
      isOpen={isOpen}
      onOpenChange={(open) => !open && onStay()}
      title="Leave without saving?"
      description="You changed something here and have not saved it. Leaving throws those changes away."
      cancelLabel="Keep editing"
      actionLabel="Leave"
      actionVariant="destructive"
      onAction={onLeave}
    />
  );
}

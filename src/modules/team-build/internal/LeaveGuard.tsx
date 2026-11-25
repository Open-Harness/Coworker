import { useEffect, useState } from "react";
import { useBlocker, useRouter } from "@tanstack/react-router";
import { AlertDialog } from "@astryxdesign/core/AlertDialog";

/** Asks before leaving a screen with edits nobody saved, whether by a link or by closing the tab. */
export function LeaveGuard({ isDirty }: { readonly isDirty: boolean }) {
  const blocker = useBlocker({ shouldBlockFn: () => isDirty, disabled: !isDirty, enableBeforeUnload: isDirty, withResolver: true });
  return (
    <AlertDialog
      isOpen={blocker.status === "blocked"}
      onOpenChange={(open) => !open && blocker.status === "blocked" && blocker.reset()}
      title="Leave without saving?"
      description="What you changed here is not saved yet. If you leave, it is lost."
      actionLabel="Leave"
      actionVariant="destructive"
      cancelLabel="Keep editing"
      onAction={() => blocker.status === "blocked" && blocker.proceed()}
    />
  );
}

/** Goes somewhere once the screen has drawn itself as saved, so its own guard lets it through. */
export function useGoOnce(): { readonly isGoing: boolean; readonly go: (address: string) => void } {
  const router = useRouter();
  const [address, go] = useState<string>();
  useEffect(() => {
    if (address !== undefined) router.history.push(address);
  }, [address, router]);
  return { isGoing: address !== undefined, go };
}

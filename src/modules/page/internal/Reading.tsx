import type { Reads } from "~/modules/api/types.ts";
import type { ReadingProps } from "../types.ts";
import { useReads, useRead, useWorkspace } from "./context.tsx";
import { Missing, Offline, Unread, useIsOffline, Waiting } from "./states.tsx";

/**
 * Reads a path of the console and draws the four things a read can be: waiting, failed, gone, and the answer. The answer is
 * dimmed under a banner when the connection is lost. Every screen that reads uses this, so none of them draws those itself.
 */
export function Reading<P extends keyof Reads>({ from, parts, loading, gone, failed, children }: ReadingProps<P>) {
  const read = useRead(from, parts);
  const reads = useReads();
  const workspace = useWorkspace();
  const isOffline = useIsOffline();
  if (read._tag === "Loading") return <>{loading ?? <Waiting />}</>;
  if (read._tag === "Gone")
    return (
      <Missing
        title={gone?.title ?? "This is not here"}
        {...(gone?.description === undefined ? {} : { description: gone.description })}
        {...(gone?.actions === undefined ? {} : { actions: gone.actions })}
      />
    );
  if (read._tag === "Failed")
    return <Unread what={failed ?? "We could not read this page"} says={read.says} onRetry={() => reads.refresh(workspace)} />;
  return isOffline ? <Offline>{children(read.value)}</Offline> : <>{children(read.value)}</>;
}

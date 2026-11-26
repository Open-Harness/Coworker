import { Button } from "@astryxdesign/core/Button";
import { Center } from "@astryxdesign/core/Center";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { links } from "./links.ts";

/** For an address whose chat or workspace was deleted, or never was. */
export function Gone({
  kind,
  workspaceId,
}: {
  readonly kind: "chat" | "workspace" | "agent" | "page";
  readonly workspaceId?: string | undefined;
}) {
  return (
    <Center minHeight="100%">
      <EmptyState
        title={`This ${kind} is gone`}
        description="Someone deleted it, or the address is wrong."
        headingLevel={1}
        actions={<Button label="New chat" href={workspaceId === undefined ? links.home : links.workspace(workspaceId)} />}
      />
    </Center>
  );
}

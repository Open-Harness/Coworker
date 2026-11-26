import { Button } from "@astryxdesign/core/Button";
import { Center } from "@astryxdesign/core/Center";
import { EmptyState } from "@astryxdesign/core/EmptyState";

/** When a screen cannot be drawn. Nothing is lost: everything lives on the server. */
export function Failed({ message, onReload }: { readonly message: string; readonly onReload: () => void }) {
  return (
    <Center minHeight="100dvh">
      <EmptyState
        title="This screen stopped working"
        description={message}
        headingLevel={1}
        actions={<Button label="Reload" variant="primary" onClick={onReload} />}
      />
    </Center>
  );
}

/** For an address that is not there, or never was. */
export function Gone() {
  return (
    <Center minHeight="100dvh">
      <EmptyState
        title="This page is gone"
        description="Someone deleted it, or the address is wrong."
        headingLevel={1}
        actions={<Button label="Home" href="/" />}
      />
    </Center>
  );
}

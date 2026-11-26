import type { ReactNode } from "react";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Center } from "@astryxdesign/core/Center";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Icon } from "@astryxdesign/core/Icon";
import { Spinner } from "@astryxdesign/core/Spinner";
import { VStack } from "@astryxdesign/core/Layout";
import { NoSymbolIcon } from "@heroicons/react/24/outline";
import type { Gone as GoneWords } from "../types.ts";
import { useClock, useOnline } from "./context.tsx";

const DIMMED = { opacity: 0.6 } as const;

/** Before anything has come: a quiet spinner in the page, never a blank. A screen with a shape of its own passes it instead. */
export function Waiting() {
  return (
    <Center axis="both" height="100%" minHeight={240}>
      <Spinner label="Loading" />
    </Center>
  );
}

/** The read did not answer. Nothing is lost, nothing stands in for a number, and the one thing to do is to try again. */
export function Unread({ what, says, onRetry }: { readonly what: string; readonly says: string; readonly onRetry: () => void }) {
  const clock = useClock();
  return (
    <VStack gap={4} padding={4}>
      <Banner
        status="error"
        title={what}
        description={`Nothing is lost. ${says === "" ? "It did not answer" : says} at ${clock.time(clock.now())}.`}
        endContent={<Button label="Try again" size="sm" variant="secondary" onClick={onRetry} />}
      />
    </VStack>
  );
}

/** A thing that is not there, or not yours: what is missing, and where to go instead. */
export function Missing({ title, description, actions }: GoneWords) {
  return (
    <Center axis="both" height="100%" minHeight={320}>
      <EmptyState
        icon={<Icon icon={NoSymbolIcon} size="lg" />}
        title={title}
        description={description ?? "It was removed, or it belongs to a workspace you are not in. Nothing else is wrong."}
        headingLevel={1}
        actions={actions}
      />
    </Center>
  );
}

/** The connection is gone: what was read stays, dimmed, and what is changed waits. */
export function Offline({ children }: { readonly children: ReactNode }) {
  const clock = useClock();
  return (
    <VStack gap={0} height="100%">
      <Banner
        container="section"
        status="error"
        title="You are offline"
        description={`This is how it was at ${clock.time(clock.now())}. What you change waits here, and goes when the connection is back.`}
      />
      <VStack height="100%" style={DIMMED} aria-disabled>
        {children}
      </VStack>
    </VStack>
  );
}

export function useIsOffline(): boolean {
  return !useOnline();
}

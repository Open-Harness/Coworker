import type { ReactNode } from "react";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Center } from "@astryxdesign/core/Center";
import { Spinner } from "@astryxdesign/core/Spinner";
import type { Loaded } from "../types.ts";

/** A page that has not loaded yet. */
export const Waiting = () => (
  <Center minHeight="60dvh">
    <Spinner size="lg" />
  </Center>
);

/** What loaded, a spinner until then, or why it did not, with a way to ask again when `onRetry` is given. */
export function Load<T>({
  loaded,
  failedTitle,
  onRetry,
  children,
}: {
  readonly loaded: Loaded<T> | undefined;
  readonly failedTitle: string;
  readonly onRetry?: () => void;
  readonly children: (value: T) => ReactNode;
}) {
  if (loaded === undefined) return <Waiting />;
  if (loaded._tag === "Failed") {
    const retry = onRetry ?? loaded.retry;
    return (
      <Banner
        status="error"
        container="section"
        title={failedTitle}
        description={loaded.message}
        endContent={retry === undefined ? undefined : <Button label="Try again" onClick={retry} />}
      />
    );
  }
  return children(loaded.value);
}

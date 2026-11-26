import type { ReactNode } from "react";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Waiting } from "~/modules/team-core/service.ts";
import type { Loading } from "~/modules/team-core/types.ts";

/** What loaded, a spinner until then, or why it did not, with a way to ask again. */
export function Fetch<T>({
  loading,
  failedTitle,
  children,
}: {
  readonly loading: Loading<T>;
  readonly failedTitle: string;
  readonly children: (value: T) => ReactNode;
}) {
  const { loaded, reload } = loading;
  if (loaded === undefined) return <Waiting />;
  if (loaded._tag === "Failed")
    return (
      <Banner
        status="error"
        container="section"
        title={failedTitle}
        description={loaded.message}
        endContent={<Button label="Try again" size="sm" onClick={reload} />}
      />
    );
  return children(loaded.value);
}

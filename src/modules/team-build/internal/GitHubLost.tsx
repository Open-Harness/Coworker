import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { VStack } from "@astryxdesign/core/Layout";
import { Text } from "@astryxdesign/core/Text";
import { useBrowser } from "~/modules/team-core/service.ts";
import type { GitHubSources } from "../types.ts";

type Lost = NonNullable<GitHubSources["lost"]>;
type Role = "owner" | "builder" | "member";

/** What a person does about a lost connection: the Owner installs the App again, anyone else asks one. */
export const fixFor = (role: Role, url: string | undefined): string =>
  role !== "owner"
    ? "Ask an Owner to install the App again."
    : url === undefined
      ? "This deployment has no GitHub App to install again."
      : "Install the App again, then choose the repos here once more.";

/** GitHub stopped: the App was uninstalled, so nothing it sends is heard until it is installed again. */
export function GitHubLost({ lost, role, url }: { readonly lost: Lost; readonly role: Role; readonly url: string | undefined }) {
  const { goTo } = useBrowser();
  return (
    <Banner
      status="error"
      title="GitHub lost its connection"
      description={
        <VStack gap={2} hAlign="start">
          <Text>{`The GitHub App was uninstalled from ${lost.account}. This manager hears nothing from GitHub now.`}</Text>
          {lost.heard.length > 0 && <Text>{`It was listening to ${lost.heard.map(({ repo }) => repo).join(", ")}.`}</Text>}
          <Text>{fixFor(role, url)}</Text>
          {role === "owner" && url !== undefined && <Button label="Connect GitHub" variant="primary" onClick={() => goTo(url)} />}
        </VStack>
      }
    />
  );
}

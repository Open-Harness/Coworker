import { List, ListItem } from "@astryxdesign/core/List";
import { Text } from "@astryxdesign/core/Text";
import { Timestamp } from "@astryxdesign/core/Timestamp";
import { PageSection } from "~/modules/ui/service.ts";
import type { VersionData } from "../types.ts";
import { seconds } from "./words.ts";

/** What was saved, by whom, newest first. */
export function Versions({ versions }: { readonly versions: readonly VersionData[] }) {
  return (
    <PageSection title="Versions">
      {versions.length === 0 ? (
        <Text color="secondary">Not saved yet.</Text>
      ) : (
        <List hasDividers edge="flush" density="compact">
          {[...versions]
            .sort((one, other) => other.version - one.version)
            .map(({ version, savedBy, savedAt, note }) => (
              <ListItem
                key={version}
                label={`v${version}${note === "" ? "" : ` · ${note}`}`}
                description={savedBy === "" ? undefined : savedBy}
                endContent={<Timestamp value={seconds(savedAt)} format="relative" />}
              />
            ))}
        </List>
      )}
    </PageSection>
  );
}

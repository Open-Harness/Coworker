import { Badge } from "@astryxdesign/core/Badge";
import { Collapsible } from "@astryxdesign/core/Collapsible";
import { HStack } from "@astryxdesign/core/Layout";
import { MetadataList, MetadataListItem } from "@astryxdesign/core/MetadataList";
import { Heading, Text } from "@astryxdesign/core/Text";
import type { RunData } from "../types.ts";

const STATE = { queued: "Queued", running: "Running", ended: "Ended" } as const;
const REPORT: Readonly<Record<string, string>> = {
  progress: "Making progress",
  waiting: "Waiting for something",
  ready: "Ready for review",
  blocked: "Blocked",
  failed: "Failed",
  dropped: "Dropped",
};

/** A run a person or the manager stopped says so, in these words, instead of how an agent's own report would. */
const stateOf = (run: RunData): { readonly label: string; readonly variant: "info" | "neutral" | "warning" } =>
  run.stopped === undefined
    ? { label: STATE[run.state], variant: run.state === "running" ? "info" : "neutral" }
    : { label: "Stopped", variant: "warning" };

function Words({ run }: { readonly run: RunData }) {
  if (run.stopped !== undefined)
    return (
      <MetadataList label={{ position: "start", width: 120 }}>
        <MetadataListItem label="Outcome">Stopped</MetadataListItem>
        <MetadataListItem label="What happened">{`Stopped by ${run.stopped.by === "" ? "someone" : run.stopped.by}. It does nothing more.`}</MetadataListItem>
      </MetadataList>
    );
  if (run.report === undefined)
    return (
      <Text color="secondary">
        {run.state === "ended" ? "It ended without a report." : "No report yet. It reports when it has something to say."}
      </Text>
    );
  return (
    <MetadataList label={{ position: "start", width: 120 }}>
      <MetadataListItem label="Outcome">{REPORT[run.report.outcome] ?? run.report.outcome}</MetadataListItem>
      {run.report.summary !== "" && <MetadataListItem label="What it said">{run.report.summary}</MetadataListItem>}
    </MetadataList>
  );
}

/** What the run reported, or why it did not: folded under its heading in the page's header. */
export function RunReport({ run }: { readonly run: RunData }) {
  const { label, variant } = stateOf(run);
  return (
    <Collapsible
      chevronPosition="start"
      trigger={
        <HStack gap={2} vAlign="center">
          <Heading level={2}>Report</Heading>
          <Badge variant={variant} label={label} />
        </HStack>
      }
    >
      <Words run={run} />
    </Collapsible>
  );
}

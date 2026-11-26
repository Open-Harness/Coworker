import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Badge } from "@astryxdesign/core/Badge";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Layout";
import { Text } from "@astryxdesign/core/Text";
import { Timestamp } from "@astryxdesign/core/Timestamp";
import { useNarrow } from "~/modules/team-core/service.ts";
import { Page } from "~/modules/ui/service.ts";
import type { AuditControls, AuditData } from "../types.ts";
import { AuditFilterBar } from "./AuditFilterBar.tsx";
import { type DataColumn, DataTable } from "./DataTable.tsx";
import { seconds } from "./words.ts";

const OUTCOME: Readonly<
  Record<AuditData["outcome"], { readonly label: string; readonly variant: "success" | "warning" | "error" | "neutral" }>
> = {
  done: { label: "Done", variant: "success" },
  asked: { label: "Asked first", variant: "warning" },
  refused: { label: "Refused", variant: "error" },
  failed: { label: "Failed", variant: "error" },
};
const PERMISSION: Readonly<Record<string, string>> = { on: "Allowed", ask: "Ask first", off: "Not allowed" };

type Line = { readonly entry: AuditData; readonly index: number };

const WHEN: DataColumn<Line> = {
  header: "When",
  width: 130,
  cell: ({ entry }) => <Timestamp value={seconds(entry.at)} format="relative" />,
};
const WHO: DataColumn<Line> = {
  header: "Who",
  width: 160,
  cell: ({ entry }) => (
    <VStack gap={0}>
      <Text weight="medium">{entry.by}</Text>
      {entry.isManager && <Text type="supporting">Manager</Text>}
    </VStack>
  ),
};
const WHAT: DataColumn<Line> = {
  header: "What happened",
  cell: ({ entry }) => (
    <VStack gap={0}>
      <Text>{entry.sentence}</Text>
      {entry.approvedBy !== undefined && <Text type="supporting">{`${entry.approvedBy} allowed it`}</Text>}
    </VStack>
  ),
};
const RAN_UNDER: DataColumn<Line> = {
  header: "Ran under",
  width: 120,
  cell: ({ entry }) => <Text color="secondary">{PERMISSION[entry.permission] ?? entry.permission}</Text>,
};
const CAME_TO: DataColumn<Line> = {
  header: "Outcome",
  width: 120,
  cell: ({ entry }) => <Badge variant={OUTCOME[entry.outcome].variant} label={OUTCOME[entry.outcome].label} />,
};

export interface AuditScreenProps {
  readonly entries: readonly AuditData[];
  /** The lines are being asked for again, after a filter changed. */
  readonly isLoading: boolean;
  /** Why the lines did not load. */
  readonly failure?: string | undefined;
  readonly onRetry: () => void;
  readonly managers: Readonly<Record<string, string>>;
  readonly categories: readonly string[];
  readonly controls: AuditControls;
  readonly onControls: (next: AuditControls) => void;
  /** Whether older lines wait on the server, and asking for them. */
  readonly hasMore: boolean;
  readonly onMore: () => Promise<void>;
  readonly moreFailure?: string | undefined;
  readonly exportHref: string;
  readonly onExport: (href: string) => void;
}

/** Who did what, under which permission, in the action's own words. Filters and pages are the server's. */
export function AuditScreen({
  entries,
  isLoading,
  failure,
  onRetry,
  managers,
  categories,
  controls,
  onControls,
  hasMore,
  onMore,
  moreFailure,
  exportHref,
  onExport,
}: AuditScreenProps) {
  const isNarrow = useNarrow();
  const where: DataColumn<Line> = {
    header: "Where",
    width: 140,
    cell: ({ entry }) => <Text color="secondary">{managers[entry.managerId] ?? "Workspace"}</Text>,
  };
  return (
    <Page
      width="wide"
      title="Audit log"
      description="Every line is the action's own sentence, written when it ran. The newest come first."
      endContent={<Button label="Export CSV" onClick={() => onExport(exportHref)} />}
    >
      <VStack gap={3}>
        <AuditFilterBar controls={controls} onControls={onControls} managers={managers} categories={categories} />
        {failure !== undefined && (
          <Banner
            status="error"
            title="The audit log did not load"
            description={failure}
            endContent={<Button label="Try again" onClick={onRetry} />}
          />
        )}
        <Text type="supporting" role="status">
          {isLoading ? "Loading…" : `${entries.length} ${entries.length === 1 ? "line" : "lines"} shown${hasMore ? ", more below" : ""}`}
        </Text>
        <DataTable
          items={entries.map((entry, index) => ({ entry, index }))}
          idOf={({ index }) => String(index)}
          empty="Nothing matches. Clear the filters, or nothing has happened yet."
          columns={isNarrow ? [WHAT, WHEN, RAN_UNDER, CAME_TO, where] : [WHEN, WHO, WHAT, RAN_UNDER, CAME_TO, where]}
        />
        {moreFailure !== undefined && <Banner status="error" title="Older lines did not load" description={moreFailure} />}
        {hasMore && (
          <HStack hAlign="center">
            <StackItem>
              <Button label="Load older lines" clickAction={onMore} />
            </StackItem>
          </HStack>
        )}
      </VStack>
    </Page>
  );
}

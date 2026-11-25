import { useCallback, useMemo, useState } from "react";
import { BoltIcon } from "@heroicons/react/24/outline";
import { BottomSheet } from "@astryxdesign/core/BottomSheet";
import { Breadcrumbs, BreadcrumbItem } from "@astryxdesign/core/Breadcrumbs";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import { Icon } from "@astryxdesign/core/Icon";
import { HStack, Layout, LayoutContent, LayoutHeader, LayoutPanel, StackItem, VStack } from "@astryxdesign/core/Layout";
import { PowerSearch, type PowerSearchFilter, usePowerSearchConfig } from "@astryxdesign/core/PowerSearch";
import { ResizeHandle, useResizable } from "@astryxdesign/core/Resizable";
import { Section } from "@astryxdesign/core/Section";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { Selector } from "@astryxdesign/core/Selector";
import { Heading } from "@astryxdesign/core/Text";
import { teamLinks, useLoading } from "~/modules/team-core/service.ts";
import type { EventLine } from "../types.ts";
import { EventInspector } from "./EventInspector.tsx";
import { EventRows } from "./EventRows.tsx";
import { Fetch } from "./Fetch.tsx";
import { type HeardRow, ORIGIN, OUTCOMES, rowsOf } from "./heard.ts";
import { useBuildApi } from "./use-api.ts";

/** How often an open Events page asks for what arrived since. */
const REFRESH_MS = 4_000;

/** Astryx's own line for this template: below it the rows keep the full width and a picked one opens as a sheet. */
const NARROW = "(max-width: 1024px)";

/** "Other" is what the Workspace writes when nothing became of a line; All shows it, nobody looks for it. */
const FILTERS = [
  { value: "all", label: "All" },
  ...OUTCOMES.filter(({ value }) => value !== "other").map(({ value, label }) => ({ value, label })),
];

/** What a person types without naming a field is looked for here. */
const ANYWHERE = "words";
const FIELDS = [
  { key: ANYWHERE, type: "string", label: "Anywhere" },
  { key: "title", type: "string", label: "What arrived" },
  { key: "from", type: "string", label: "From" },
  {
    key: "origin",
    type: "enum",
    label: "Source",
    enumValues: [
      { value: "email", label: ORIGIN.email },
      { value: "github", label: ORIGIN.github },
    ],
  },
] as const;

/** The first row on the page: groups come in their own order. */
const topOf = (rows: readonly HeardRow[]): HeardRow | undefined =>
  OUTCOMES.flatMap(({ value }) => rows.filter(({ outcome }) => outcome === value))[0];

interface Where {
  readonly workspaceId: string;
  readonly managerId: string;
}

interface FilterProps {
  readonly value: string;
  readonly isNarrow: boolean;
  readonly onChange: (value: string) => void;
}

const OutcomeFilter = ({ value, isNarrow, onChange }: FilterProps) =>
  isNarrow ? (
    <Selector label="What became of it" isLabelHidden size="sm" options={FILTERS} value={value} onChange={onChange} />
  ) : (
    <SegmentedControl label="What became of it" value={value} size="sm" onChange={onChange}>
      {FILTERS.map((one) => (
        <SegmentedControlItem key={one.value} value={one.value} label={one.label} />
      ))}
    </SegmentedControl>
  );

/** Astryx's `incident-console`: search, rows grouped by what became of them, and the picked one beside them. */
function Console({ workspaceId, managerId, events, outcome }: Where & { readonly events: readonly EventLine[]; readonly outcome: string }) {
  const rows = useMemo(() => rowsOf(events), [events]);
  const [filters, setFilters] = useState<readonly PowerSearchFilter[]>([]);
  // The top row when the page opened: what arrives later does not change what is being read.
  const [picked, setPicked] = useState(() => topOf(rows)?.id);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const { config, applyFilters } = usePowerSearchConfig(FIELDS, "Events");
  const search = useMemo(() => ({ ...config, contentSearchFieldKey: ANYWHERE }), [config]);
  const isNarrow = useMediaQuery(NARROW);
  const inspector = useResizable({ defaultSize: 380, minSize: 320, maxSize: 480 });
  const shown = applyFilters(filters, rows).filter((row) => outcome === "all" || row.outcome === outcome);
  // From every row, so one that a filter hides stays open while it is read.
  const selected = rows.find(({ id }) => id === picked);
  const detail = selected !== undefined && <EventInspector row={selected} workspaceId={workspaceId} managerId={managerId} />;
  const pick = (id: string) => {
    setPicked(id);
    setIsSheetOpen(isNarrow);
  };
  return (
    <Layout
      height="fill"
      content={
        <LayoutContent padding={0}>
          <Section variant="transparent" padding={3}>
            <PowerSearch
              label="Search events"
              placeholder="Search events…"
              config={search}
              filters={filters}
              onChange={setFilters}
              resultCount={shown.length}
            />
          </Section>
          <EventRows rows={shown} selectedId={isNarrow && !isSheetOpen ? undefined : picked} isNarrow={isNarrow} onSelect={pick} />
          {isNarrow && selected !== undefined && (
            <BottomSheet isOpen={isSheetOpen} onOpenChange={setIsSheetOpen} label={selected.title} padding={4}>
              {detail}
            </BottomSheet>
          )}
        </LayoutContent>
      }
      {...(isNarrow
        ? {}
        : {
            end: (
              <>
                <ResizeHandle
                  direction="horizontal"
                  hasDivider
                  isAlwaysVisible={false}
                  resizable={inspector.props}
                  label="Resize the details"
                />
                <LayoutPanel width={inspector.size} padding={4} role="complementary" label="Event">
                  {detail || (
                    <EmptyState
                      title="No event picked"
                      description="Pick one to see what the Gate made of it and what the manager decided."
                      icon={<Icon icon={BoltIcon} size="lg" />}
                      isCompact
                    />
                  )}
                </LayoutPanel>
              </>
            ),
          })}
    />
  );
}

/** Everything a manager heard, newest first, what the Gate made of it, what the manager made of it, and why. */
export function Events({ workspaceId, managerId }: Where) {
  const api = useBuildApi();
  const [outcome, setOutcome] = useState("all");
  const isNarrow = useMediaQuery(NARROW);
  const events = useLoading(
    useCallback(() => api.events(workspaceId, managerId), [api, workspaceId, managerId]),
    REFRESH_MS,
  );
  const manager = useLoading(useCallback(() => api.manager(workspaceId, managerId), [api, workspaceId, managerId]));
  const name = manager.loaded?._tag === "Loaded" ? manager.loaded.value.name : "Manager";
  return (
    <Layout
      height="fill"
      header={
        <LayoutHeader padding={4} hasDivider>
          <HStack gap={3} vAlign="center" wrap="wrap">
            <StackItem size="fill">
              <VStack gap={0.5}>
                <Breadcrumbs variant="supporting">
                  <BreadcrumbItem href={teamLinks.board(workspaceId, managerId)}>{name}</BreadcrumbItem>
                  <BreadcrumbItem isCurrent>Events</BreadcrumbItem>
                </Breadcrumbs>
                <Heading level={1}>Events</Heading>
              </VStack>
            </StackItem>
            <OutcomeFilter value={outcome} isNarrow={isNarrow} onChange={setOutcome} />
          </HStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent padding={0}>
          <Fetch loading={events} failedTitle="Events did not load">
            {(lines) =>
              lines.length === 0 ? (
                <EmptyState
                  title="Nothing has arrived yet"
                  description="Mail to the manager's address, and what its sources hear, shows up here with what became of it."
                  icon={<Icon icon={BoltIcon} size="lg" />}
                />
              ) : (
                <Console workspaceId={workspaceId} managerId={managerId} events={lines} outcome={outcome} />
              )
            }
          </Fetch>
        </LayoutContent>
      }
    />
  );
}

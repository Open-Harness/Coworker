import { lazy, Suspense } from "react";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { HStack, VStack } from "@astryxdesign/core/Layout";
import { Spinner } from "@astryxdesign/core/Spinner";
import { Table } from "@astryxdesign/core/Table";
import { Token } from "@astryxdesign/core/Token";
import { VisuallyHidden } from "@astryxdesign/core/VisuallyHidden";
import type { ChartColor, DonutChartProps, SeriesChartProps } from "../types.ts";
import type { Drawing } from "./Chart.tsx";

/*
 * What every chart is wrapped in: a name for the picture, the same numbers as a table anyone can read without it, a
 * legend, and a note instead of a flat line when there is nothing to show. The drawing itself (recharts, a large library)
 * is fetched when the first chart appears, so the pages without one do not carry it.
 */

const Drawn = lazy(() => import("./Chart.tsx"));

const DEFAULT_HEIGHT = 240;

interface FrameProps {
  readonly label: string;
  readonly height: number;
  readonly isEmpty: boolean;
  readonly emptyText: string;
  readonly legend: readonly { readonly name: string; readonly color: ChartColor }[];
  readonly columns: readonly { readonly key: string; readonly header: string }[];
  readonly rows: readonly Record<string, string | number>[];
  readonly drawing: Drawing;
}

function Frame({ label, height, isEmpty, emptyText, legend, columns, rows, drawing }: FrameProps) {
  if (isEmpty) return <EmptyState title={emptyText} isCompact />;
  return (
    <VStack gap={3}>
      {legend.length > 1 && (
        <HStack gap={2} wrap="wrap">
          {legend.map(({ name, color }) => (
            <Token key={name} size="sm" color={color} label={name} />
          ))}
        </HStack>
      )}
      <VStack role="img" aria-label={label} height={height}>
        <Suspense fallback={<Spinner aria-label={`Loading ${label}`} />}>
          <Drawn {...drawing} />
        </Suspense>
      </VStack>
      <VisuallyHidden as="div">
        <Table
          aria-label={`${label}, as numbers`}
          density="compact"
          idKey="id"
          data={rows.map((row, id) => ({ ...row, id }))}
          columns={columns.map((column) => ({ ...column }))}
        />
      </VisuallyHidden>
    </VStack>
  );
}

const unitOf = (unit: string | undefined, value: number): string => (unit === undefined ? String(value) : `${value} ${unit}`);

/** Steps over time, one line per series. */
export function LineChart(props: SeriesChartProps) {
  return <SeriesFrame {...props} kind="line" />;
}

/** Steps over time, one bar per step, side by side or stacked. */
export function BarChart(props: SeriesChartProps) {
  return <SeriesFrame {...props} kind="bar" />;
}

function SeriesFrame({ kind, ...props }: SeriesChartProps & { readonly kind: "line" | "bar" }) {
  const { label, labels, series, unit, emptyText = "Nothing yet", height = DEFAULT_HEIGHT } = props;
  return (
    <Frame
      label={label}
      height={height}
      // One lonely point makes no line, and a chart of zeros says less than a sentence does.
      isEmpty={labels.length < (kind === "line" ? 2 : 1) || series.every(({ values }) => values.every((value) => value === 0))}
      emptyText={emptyText}
      legend={series}
      columns={[{ key: "label", header: "When" }, ...series.map(({ name }) => ({ key: name, header: name }))]}
      rows={labels.map((when, index) => ({
        label: when,
        ...Object.fromEntries(series.map(({ name, values }) => [name, unitOf(unit, values[index] ?? 0)])),
      }))}
      drawing={{ ...props, kind }}
    />
  );
}

/** Parts of a whole, with the whole in the middle. */
export function DonutChart(props: DonutChartProps) {
  const { label, slices, emptyText = "Nothing yet", height = DEFAULT_HEIGHT } = props;
  return (
    <Frame
      label={label}
      height={height}
      isEmpty={slices.every(({ value }) => value === 0)}
      emptyText={emptyText}
      legend={slices}
      columns={[
        { key: "name", header: "Part" },
        { key: "value", header: "Count" },
      ]}
      rows={slices.map(({ name, value }) => ({ name, value }))}
      drawing={{ ...props, kind: "donut" }}
    />
  );
}

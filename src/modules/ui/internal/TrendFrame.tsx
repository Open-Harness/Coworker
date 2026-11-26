import { lazy, Suspense } from "react";
import { Spinner } from "@astryxdesign/core/Spinner";
import type { TrendProps } from "./Chart.tsx";

/** A week against the one before, drawn when the first one appears: the library that draws it is large. */
const Drawn = lazy(() => import("./Chart.tsx").then((chart) => ({ default: chart.Trend })));

export function TrendChart(props: TrendProps) {
  return (
    <Suspense fallback={<Spinner aria-label="Loading the chart" />}>
      <Drawn {...props} />
    </Suspense>
  );
}
export type { TrendProps };

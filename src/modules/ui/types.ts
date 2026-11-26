/*
 * Pieces of the page made only of Astryx components, that no screen owns: the charts, and what the root draws when a
 * screen fails or an address is wrong. They draw props and report what people do; they know nothing of routes or stores.
 */

/** Astryx's data colours, by name: the categorical ones, and `neutral` for a series that is not a category. A chart never takes a raw colour. */
export type ChartColor = "neutral" | "blue" | "orange" | "teal" | "purple" | "red" | "green" | "pink" | "cyan";

export interface ChartSeries {
  readonly name: string;
  /** One number per label. */
  readonly values: readonly number[];
  readonly color: ChartColor;
}

/** A line or bar chart over labelled steps such as days. */
export interface SeriesChartProps {
  /** What the chart shows, as its accessible name and the caption of its numbers. */
  readonly label: string;
  /** One per step, already short enough to sit on an axis: `24 Nov`. */
  readonly labels: readonly string[];
  readonly series: readonly ChartSeries[];
  /** Bars of several series stack instead of standing side by side. */
  readonly isStacked?: boolean;
  /** The axis may stop at fractions (hours); by default it counts whole things. */
  readonly hasDecimals?: boolean;
  /** Said after each number in the text alternative and the tooltip: `hours`. */
  readonly unit?: string;
  /** What to say instead of a flat chart when every number is zero. */
  readonly emptyText?: string;
  readonly height?: number;
  /** Where the axis counts: its ticks, how high it goes, and what goes before a number on it (`$`). Bars only. */
  readonly axis?: { readonly ticks: readonly number[]; readonly top: number; readonly prefix?: string };
  /** Dashed lines across the bars, at these values: a limit, where to be told. Bars only. */
  readonly lines?: readonly number[];
  /** A bar at or above this is drawn red, so that a day over the line shows. One series only. */
  readonly over?: number;
}

export interface DonutChartProps {
  readonly label: string;
  readonly slices: readonly { readonly name: string; readonly value: number; readonly color: ChartColor }[];
  /** The big number or word in the hole. */
  readonly centre?: string;
  readonly emptyText?: string;
  readonly height?: number;
}

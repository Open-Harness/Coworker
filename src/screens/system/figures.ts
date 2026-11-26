import type { Tile } from "~/modules/views-workspace/types.ts";

/** What each of the six numbers counts, in words. The view gives the figures; these are the page's own sentences. */
export const MEANS: Readonly<Record<string, string>> = {
  line: "Against the date each should be met",
  people: "Answering, reviewing, putting right",
  wait: "From their message to a first answer",
  sent: "By a person, of what was finished",
  waiting: "Work that stands still now",
  cost: "Models, searches and machines",
};

export type Rag = "green" | "amber" | "red";

/** A tile's figure, said the way its unit says it. */
export const valueOf = (tile: Tile): string => {
  const value = tile.value ?? 0;
  if (tile.value === null) return "–";
  switch (tile.unit) {
    case "count":
      return String(value);
    case "hours":
      return `${value} hours`;
    case "dollars":
      return `$${value.toLocaleString("en-US")}`;
    case "share":
      return `${Math.round(value * 100)}%`;
    case "of":
      return `${value} of ${tile.of ?? 0}`;
  }
};

/** What moved, in the tile's own terms: a share of what it was, points of a share, or a count. */
export const changeOf = (tile: Tile): { readonly delta: number; readonly text: string } => {
  const change = tile.change ?? 0;
  const delta = tile.unit === "of" ? change : change * 100;
  const sign = delta > 0 ? "+" : "";
  if (tile.unit === "of") return { delta, text: `${sign}${delta}` };
  return { delta, text: `${sign}${delta.toFixed(1)}${tile.unit === "share" ? " points" : "%"}` };
};

/** A change becomes red, amber or green by size and by whether the direction is the good one. */
export function ragFor(delta: number, higherIsBetter: boolean): Rag {
  const isFavourable = higherIsBetter ? delta >= 0 : delta <= 0;
  const size = Math.abs(delta);
  if (isFavourable) return size >= 1 ? "green" : "amber";
  return size >= 3 ? "red" : "amber";
}

/** How far a goal is from where it should be today: green within 10 points, amber within 30. */
export function goalRag(percent: number, line: number): Rag {
  if (percent >= line - 10) return "green";
  if (percent >= line - 30) return "amber";
  return "red";
}

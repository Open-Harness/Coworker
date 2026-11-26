import type { Doing, WalkStep } from "../types.ts";

/** The page, each field that has a value in the doing's own order, and the control last, which a person presses if it stops. */
export function walk(all: readonly Doing[], id: string, values: Readonly<Record<string, string>>): readonly WalkStep[] {
  const doing = all.find((x) => x.id === id);
  if (!doing) return [];
  const page = doing.at.page;
  const go: WalkStep = { say: `Going to ${page}.`, at: { page, press: null }, does: "go", yours: false };
  const fills = doing.fields.flatMap((x): WalkStep[] => {
    const value = Object.hasOwn(values, x.name) ? values[x.name] : undefined;
    return value === undefined
      ? []
      : [{ say: `Filling in ${x.label.toLowerCase()}.`, at: { page, press: null }, does: "fill", field: x.name, value, yours: false }];
  });
  const press: WalkStep = {
    say: doing.stops ? `${doing.at.press} is yours to press.` : `Pressing ${doing.at.press}.`,
    at: { page, press: doing.at.press },
    does: "press",
    yours: doing.stops,
  };
  return [go, ...fills, press];
}

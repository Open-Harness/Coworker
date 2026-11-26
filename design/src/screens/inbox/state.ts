import type { Item, Option } from "./data";

type Change = (item: Item) => Item;
export const change = (all: Item[], id: string, f: Change): Item[] => all.map((item) => (item.id === id ? f(item) : item));

export const seen: Change = (item) => ({ ...item, isNew: false });

/** An answer takes the item out of the list into Done, with what was said. A reminder or a look leaves it where it is. */
export const answer = (option: Option): Change => (item) =>
  option.keeps || option.go ? { ...item, isNew: false } : { ...item, isNew: false, standing: "done", answered: option.label };

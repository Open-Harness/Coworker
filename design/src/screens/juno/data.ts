export const PAGES = [
  { title: "Juno", items: ["About", "Soul", "Talking", "Triggers", "Skills"] },
  { title: "What it knows and may do", items: ["Memory", "May do", "Spending", "History"] },
] as const;
export const ALL: readonly string[] = PAGES.flatMap((p) => [...p.items]);
export const slug = (i: string) => `juno-${i.toLowerCase().replaceAll(" ", "-")}`;
export const here = (hash: string) => ALL.find((i) => slug(i) === hash) ?? "About";

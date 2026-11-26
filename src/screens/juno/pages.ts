/** The nine pages of Juno, in two groups. A page's address is `/juno/<slug>`, and About is `/juno`. */
export const GROUPS = [
  { title: "Juno", items: ["About", "Soul", "Talking", "Triggers", "Skills"] },
  { title: "What it knows and may do", items: ["Memory", "May do", "Spending", "History"] },
] as const;
export const ALL: readonly string[] = GROUPS.flatMap((group) => [...group.items]);

export const slugOf = (page: string): string => page.toLowerCase().replaceAll(" ", "-");
export const addressOf = (page: string): string => (page === "About" ? "/juno" : `/juno/${slugOf(page)}`);
/** The page an address names, or undefined when there is none. */
export const pageAt = (slug: string | undefined): string | undefined =>
  slug === undefined ? "About" : ALL.find((page) => slugOf(page) === slug);

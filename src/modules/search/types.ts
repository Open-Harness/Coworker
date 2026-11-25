/**
 * Something a person can find: a page or a task in one manager, a manager, or a person of the workspace. A manager's
 * `id` is its `managerId`; a person's `id` is their person id and has no manager, so `managerId` is empty.
 */
export interface Searchable {
  readonly kind: "page" | "task" | "manager" | "person";
  readonly id: string;
  readonly managerId: string;
  readonly title: string;
  readonly body: string;
}

export interface SearchHit extends Searchable {
  /** A short passage around the first match, for the results list. */
  readonly snippet: string;
  /** Higher is better. Comparable across managers, so their hits can be merged. */
  readonly score: number;
}

/**
 * Finds pages, tasks, managers and people by their words. Every word of the query must appear, in the title or the body; title matches
 * rank first. Pure, so each manager searches its own and the Worker merges.
 */
export interface Search {
  readonly find: (items: readonly Searchable[], query: string, limit?: number) => readonly SearchHit[];
  readonly merge: (lists: readonly (readonly SearchHit[])[], limit?: number) => readonly SearchHit[];
}

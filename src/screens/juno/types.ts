import type { CoworkerView } from "~/modules/views-workspace/types.ts";

/** What a page is saved with: it answers whether it was saved. */
export type Save = () => Promise<boolean>;

/** What each page of Juno is given: the view, and a way to say there is something to save. */
export interface JunoPage {
  readonly view: CoworkerView;
  /** Called with a save for the page as it is now, every time it changes. */
  readonly onDirty: (save: Save) => void;
}

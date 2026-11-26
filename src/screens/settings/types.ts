import type { ComponentType } from "react";

/** A page says something has changed, and what pressing Save does about it. */
export type Dirty = (save: () => unknown) => void;

/** One page of Settings: what draws it, whether the header has its Save, and whether it fills the pane itself. */
export interface SettingsPage {
  readonly Body: ComponentType<{ readonly onDirty: Dirty }>;
  readonly save?: true;
  readonly fills?: true;
}

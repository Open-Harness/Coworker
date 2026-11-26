/* The page as the co-worker meets it: a control by its accessible name, where it is, and pressing and filling it as a person would. The document is given, never reached for. */

const CONTROLS =
  "button, [role=button], input:not([type=hidden]), textarea, select, [role=textbox], [role=combobox], [role=switch], [role=checkbox], a[href]";

const squeeze = (text: string | null | undefined): string => (text ?? "").replaceAll(/\s+/gu, " ").trim();

function namedBy(root: ParentNode, ids: string): string {
  return ids
    .split(/\s+/u)
    .map((id) => squeeze(root.querySelector(`[id="${id}"]`)?.textContent))
    .join(" ")
    .trim();
}

/** What a control is called to someone who cannot see it: its label, what labels it, or its words. */
export function nameOf(root: ParentNode, control: HTMLElement): string {
  const label = squeeze(control.getAttribute("aria-label"));
  if (label !== "") return label;
  const by = control.getAttribute("aria-labelledby");
  if (by !== null && namedBy(root, by) !== "") return namedBy(root, by);
  if (control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement || control instanceof HTMLSelectElement) {
    const first = control.labels?.[0];
    if (first !== undefined) return squeeze(first.textContent);
    return squeeze(control.getAttribute("placeholder"));
  }
  return squeeze(control.textContent);
}

const shown = (control: HTMLElement): boolean => control.getClientRects().length > 0 && control.checkVisibility();

/** The control with exactly this name that can be seen: one in an open dialog first, since that is where a person is. */
export function findControl(root: ParentNode, name: string): HTMLElement | null {
  const all = [...root.querySelectorAll<HTMLElement>(CONTROLS)].filter((one) => shown(one) && nameOf(root, one) === name);
  return all.find((one) => one.closest("dialog[open]") !== null) ?? all[0] ?? null;
}

/** Whether an open dialog stands between a person and the rest of the page. */
export const dialogOpen = (root: ParentNode): HTMLElement | null => root.querySelector<HTMLElement>("dialog[open]");

export const usable = (control: HTMLElement): boolean =>
  !(control instanceof HTMLButtonElement && control.disabled) && control.getAttribute("aria-disabled") !== "true";

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export function rectOf(control: HTMLElement): Rect {
  const box = control.getBoundingClientRect();
  return { x: box.left, y: box.top, w: box.width, h: box.height };
}

export const bring = (control: HTMLElement): void => control.scrollIntoView({ block: "center", inline: "nearest" });

/** A press, as the page hears any press. */
export const press = (control: HTMLElement): void => control.click();

/** Puts words in a field the way typing does, so that what draws it hears it. */
export function fill(control: HTMLElement, value: string): void {
  if (!(control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement)) return;
  const set = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(control), "value")?.set;
  set?.call(control, value);
  control.dispatchEvent(new Event("input", { bubbles: true }));
}

/** A ring on what the co-worker is at; it goes with a call that gives the ring back. */
export function ring(control: HTMLElement): () => void {
  const [outline, offset] = [control.style.outline, control.style.outlineOffset];
  control.style.outline = "2px solid var(--color-data-categorical-blue, #2563eb)";
  control.style.outlineOffset = "3px";
  return () => {
    control.style.outline = outline;
    control.style.outlineOffset = offset;
  };
}

import { useCallback, useState } from "react";

/** What a form shows while it is being edited: the saved value until a field changes, and whether it differs now. */
export interface Draft<T> {
  readonly value: T;
  readonly change: (patch: Partial<T>) => void;
  readonly isDirty: boolean;
  readonly discard: () => void;
}

const same = (one: unknown, other: unknown): boolean => JSON.stringify(one) === JSON.stringify(other);

/** A form's working copy of `saved`. When `saved` changes, such as after a save, the copy starts again from it. */
export function useDraft<T extends object>(saved: T): Draft<T> {
  const [state, setState] = useState({ from: saved, value: saved });
  if (!same(state.from, saved)) setState({ from: saved, value: saved });
  const change = useCallback((patch: Partial<T>) => setState((now) => ({ ...now, value: { ...now.value, ...patch } })), []);
  const discard = useCallback(() => setState((now) => ({ ...now, value: now.from })), []);
  return { value: state.value, change, isDirty: !same(state.value, state.from), discard };
}

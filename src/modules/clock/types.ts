/** Time and ids, injected so tests decide them. */
export interface Clock {
  /** Milliseconds since the epoch. */
  readonly now: () => number;
}

export interface Ids {
  /** A new id, unique within this deployment: `<prefix>_<random>`. */
  readonly next: (prefix: string) => string;
}

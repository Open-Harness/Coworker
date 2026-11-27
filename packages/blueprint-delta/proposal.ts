// One named proposal: what Orthograph can't say yet, and the smallest declaration that would say it. A proposal is data
// for a person to read; nothing runs it, and no generator reads it.
export interface Proposal {
  readonly id: `D${number}`;
  readonly name: string;
  /** What it is. */
  readonly what: string;
  /** Why Co-worker needs it, with where the need was found. */
  readonly why: string;
  /** Where in Orthograph it would go: the module, and the compiler's or the host's part. */
  readonly where: string;
  /** The blueprint files that wait on it. */
  readonly waits: ReadonlyArray<string>;
}

export const proposal = <const P extends Proposal>(p: P): P => Object.freeze(p);

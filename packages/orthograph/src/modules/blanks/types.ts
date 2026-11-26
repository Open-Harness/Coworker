// Blanks: a part of a declaration not written yet. A blank compiles; `ortho check` names it with file and line.
export interface Blank {
  readonly kind: "blank";
  readonly what: string;
}

export interface BlanksApi {
  /** `Blueprint.todo("who may call")` fits wherever a declaration needs something, until it is filled. */
  readonly todo: <T = never>(what: string) => T;
  readonly isBlank: (x: unknown) => x is Blank;
}

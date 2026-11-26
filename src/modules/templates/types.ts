import type { Change, Clash, Files, Path, Problem, Surroundings } from "~/modules/playbook/types.ts";

/* A template: a playbook with blanks. Many managers from one, each with its own copy. Pure. */

/** In the files a blank is written `{{repo}}`. */
export interface Blank {
  readonly id: string;
  /** What the person is asked. */
  readonly ask: string;
  readonly is:
    | { readonly a: "place"; readonly connector: string }
    | { readonly a: "person" }
    | { readonly a: "number"; readonly unit: string }
    | { readonly a: "text" }
    /** Which model an agent has. A template never answers this. */
    | { readonly a: "model"; readonly agent: string };
  /** Its answer when nobody says otherwise. Only a place may have none. */
  readonly best: { readonly value: string; readonly from: string } | null;
}

export interface Template {
  readonly id: string;
  readonly version: number;
  readonly name: string;
  readonly about: string;
  readonly whose: "ours" | "this workspace";
  readonly needs: readonly string[];
  readonly files: Files;
  readonly blanks: readonly Blank[];
}

export type Answers = Readonly<Record<string, string>>;

export type Filled =
  | { readonly _tag: "Filled"; readonly files: Files; readonly from: { readonly template: string; readonly version: number } }
  /** Blanks with no answer, by id. */
  | { readonly _tag: "Blank"; readonly blanks: readonly string[] }
  | { readonly _tag: "Problems"; readonly problems: readonly Problem[] };

export interface SaveAs {
  readonly id: string;
  readonly name: string;
  readonly about: string;
  readonly files: Files;
}

/** The copy a manager has, as it was given and as it is now. */
export interface Copy {
  readonly template: string;
  readonly version: number;
  readonly given: Files;
  readonly now: Files;
}

/** What a newer template would change here. What the manager changed itself is kept; where both did, both are shown. */
export type Newer =
  | { readonly _tag: "Same" }
  | { readonly _tag: "Suggestion"; readonly version: number; readonly changes: readonly Change[]; readonly clashes: readonly Clash[] };

export interface Templates {
  /** Ours, as files in `docs/templates`, given in by the composition root. */
  readonly read: (
    folder: Files,
  ) => { readonly _tag: "Template"; readonly template: Template } | { readonly _tag: "Problems"; readonly problems: readonly Problem[] };
  /** Every blank has an answer or a best. Then the files are read and checked. */
  readonly fill: (template: Template, answers: Answers, around: Surroundings) => Filled;
  /** Places, people, models, secrets and cases become blanks or go. `gone` says which lines. */
  readonly saveAs: (input: SaveAs) => {
    readonly template: Template;
    readonly gone: readonly { readonly at: Path; readonly says: string }[];
  };
  readonly newer: (copy: Copy, template: Template) => Newer;
}

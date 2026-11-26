/* What waits for a person. One to one, with a date, and silence never approves. Pure; the inbox stores them. */

export type Need = "decide" | "approve" | "do" | "review" | "know";

/** Exactly what will be sent or done, in the words it will be sent in. */
export interface Shows {
  readonly action: string;
  readonly where: string;
  readonly text: string;
}

export interface Ask {
  readonly id: string;
  readonly to: string;
  readonly need: Need;
  readonly about: { readonly work?: string; readonly thread?: string; readonly manager: string; readonly title: string };
  readonly question: string;
  readonly why: string;
  readonly options: readonly { readonly id: string; readonly label: string; readonly then: string }[];
  readonly best: string | null;
  readonly shows: Shows | null;
  readonly at: number;
  readonly by: number | null;
  readonly then: readonly string[];
  /** What it does without an answer. Only for `decide`, and never something outside. */
  readonly else: { readonly option: string } | "wait";
  readonly reminded: number;
  readonly state:
    | { readonly _tag: "Open" }
    | { readonly _tag: "Answered"; readonly by: string; readonly answer: string; readonly where: string; readonly at: number }
    | { readonly _tag: "Gone"; readonly why: string };
}

export type NewAsk = Omit<Ask, "reminded" | "state" | "at">;
export type Asked = { readonly _tag: "Asked"; readonly ask: Ask } | { readonly _tag: "Refused"; readonly why: string };

export type Due =
  | { readonly _tag: "Nothing" }
  | { readonly _tag: "Remind"; readonly person: string }
  | { readonly _tag: "StandIn"; readonly person: string }
  | { readonly _tag: "Else"; readonly option: string };

export interface Reply {
  readonly by: string;
  readonly answer: string;
  readonly where: string;
  readonly at: number;
  /** May this person answer it: it is theirs, they stand in, or they are an Owner. */
  readonly may: boolean;
}

export type Answered =
  | { readonly _tag: "Answered"; readonly ask: Ask }
  | { readonly _tag: "Late"; readonly ask: Ask; readonly says: string }
  | { readonly _tag: "Refused"; readonly why: string };

/** "Always": for this thread, this person or this kind. Code can check it, or it is not offered. */
export interface Rule {
  readonly id: string;
  readonly action: string;
  readonly when: { readonly thread: string } | { readonly person: string } | { readonly kind: string };
  readonly by: string;
  readonly at: number;
  readonly right: number;
  readonly wrong: number;
  readonly state: "on" | "back to ask" | "taken away";
}

export interface Asks {
  readonly ask: (input: NewAsk, at: number) => Asked;
  readonly answer: (ask: Ask, reply: Reply) => Answered;
  /** Past its date: one reminder, then each stand-in in turn, then `else`, if it has one. */
  readonly due: (ask: Ask, now: number) => Due;
  /** Who is asked: who answers for the work, else who lent the account, else who asked. Never who is away, when there is another. */
  readonly whom: (input: {
    readonly answers?: string;
    readonly lender?: string;
    readonly asked?: string;
    readonly away: readonly string[];
    readonly owners: readonly string[];
  }) => string;
  readonly covers: (
    rule: Rule,
    use: { readonly action: string; readonly thread: string; readonly person: string; readonly kind: string },
  ) => boolean;
  /** Wrong twice in a row: back to ask. */
  readonly afterUse: (rule: Rule, right: boolean, lastWasRight: boolean) => Rule;
}

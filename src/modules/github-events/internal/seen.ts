import type { HeardEvent, Us } from "../types.ts";
import type { GithubRecord, Who } from "../records.ts";
import { mentions } from "./mention.ts";

/** What one handler made of one delivery, before it is told apart as heard or noise. */
export interface Seen {
  readonly records: readonly GithubRecord[];
  /** `null`: kept, and nobody is told. */
  readonly heard: HeardEvent | null;
  readonly why: string;
  readonly numbers: readonly number[];
  readonly sha: string | null;
  readonly who: Who;
  readonly addressed: boolean;
  readonly title: string;
  readonly text: string;
  readonly same: string;
  /** It was done by us. */
  readonly ours: boolean;
}

export interface Context {
  readonly repo: string;
  readonly action: string;
  readonly sender: Who;
  readonly us: Us;
}

export const isOurs = (who: Who, us: Us): boolean => who.login.toLowerCase() === us.login.toLowerCase();
export const speaksTo = (text: string, us: Us): boolean => mentions(text, us.mention);
export const isOurLabel = (name: string | undefined, us: Us): boolean =>
  name !== undefined && name.toLowerCase() === us.label.toLowerCase();

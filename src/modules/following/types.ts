import type { Clock } from "~/modules/clock/types.ts";
import type { GithubRecord, Kept, Told, Us } from "~/modules/github-events/types.ts";
import type { OpenWork } from "~/modules/intake/types.ts";
import type { WorkEvent } from "~/modules/work/types.ts";

/*
 * What GitHub says of a pull request or an issue, kept as it is, and what became true because of it told to the work that follows it.
 * A comment or a review is a person speaking: intake judges it, and `deciding` hands it on. A check, a moved main, a merge and a close
 * are not speech: they are read from the records (`github-events`), and each goes once to the work that follows that conversation.
 */

/** What one delivery carried, as `github-events` read it. */
export interface Heard {
  readonly repo: string;
  readonly event: string;
  readonly records: readonly GithubRecord[];
  /** The issues and pull requests it is about. A check names a commit: `sha`. */
  readonly numbers: readonly number[];
  readonly sha: string | null;
  readonly us: Us;
}

/** Something that became true of one conversation, to be told to whoever follows it. Each has an id, made of the thing: once. */
export interface News {
  readonly id: string;
  readonly repo: string;
  readonly number: number;
  readonly told: Told;
  /** The checks that passed, by name, when this is a check that passed. */
  readonly passed: readonly string[];
  /** When it was heard: news that nobody follows is let go of a minute later. */
  readonly since: number;
  /** It was learned by asking GitHub, because a delivery was missed: what people said is not told again by intake, so it is told here. */
  readonly asked: boolean;
}

/**
 * A conversation that must be asked for. After a push to the default branch a delivery does not say whether a pull request still
 * merges; after the App was away, deliveries were missed, and `all` asks for everything a conversation holds. `number` 0: every
 * conversation of the repo that work follows.
 */
export interface Wanted {
  readonly repo: string;
  readonly number: number;
  readonly us: Us;
  readonly since: number;
  readonly all: boolean;
}

/** What it keeps: the records of each repo, what became true and was not yet told, and the pull requests to ask GitHub about. */
export interface FollowStore {
  readonly kept: (repo: string) => Kept;
  readonly keep: (repo: string, kept: Kept) => void;
  /** Once by id: what is kept already is not kept again. */
  readonly addNews: (news: readonly News[]) => void;
  readonly news: () => readonly News[];
  readonly told: (id: string) => void;
  /** A want for what is already wanted is the newer of the two, and asks for everything if either does. */
  readonly want: (wanted: Wanted) => void;
  readonly wanted: () => readonly Wanted[];
  /** Done with what was asked since `since`: a want that came after it is still owed. */
  readonly got: (repo: string, number: number, since: number) => void;
  /** The repos it has heard. */
  readonly repos: () => readonly string[];
}

/** A manager that hears a repo, as far as following needs of it. */
export interface Listener {
  /** Its open work, and the conversations each follows (`github:acme/web#412`, its own issue first). */
  readonly open: () => Promise<readonly OpenWork[]>;
  readonly news: (input: { readonly work: string; readonly event: WorkEvent; readonly says?: string }) => Promise<void>;
}

export interface FollowDeps {
  readonly store: FollowStore;
  readonly listeners: (repo: string) => Promise<readonly Listener[]>;
  /** One read of GitHub's REST for a repo, as it answers. Undefined when it cannot be asked: the App is gone, or GitHub is out of reach. */
  readonly read: (repo: string, path: string) => Promise<unknown>;
  readonly clock: Clock;
}

export interface Following {
  /** A delivery was heard: its records are kept, and what became true is made news. Nothing outside is touched. */
  readonly hear: (heard: Heard) => void;
  /** The App is back after it was away: what came in meanwhile is asked of GitHub, for every conversation that work follows. */
  readonly back: (us: Us) => void;
  /** Asks GitHub what a delivery cannot say, and tells the work what became true. Answers when to come back, if something is owed. */
  readonly run: () => Promise<{ readonly again: number | null }>;
}

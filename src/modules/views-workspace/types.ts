import type { Ask } from "~/modules/asks/types.ts";
import type { Chat, ChatLine, Did, Identity, MayDo, Part, Talking } from "~/modules/coworker/types.ts";
import type { Doing, Role } from "~/modules/doings/types.ts";
import type { Note } from "~/modules/knowledge/types.ts";
import type { Skill, Trigger } from "~/modules/playbook/types.ts";
import type { Standing } from "~/modules/measures/types.ts";
import type { Rolled } from "~/modules/tree/types.ts";
import type { Template } from "~/modules/templates/types.ts";

export type * from "./settings.ts";

/* What the workspace's screens are given. Data, not words: times in ms, money in dollars, shares 0 to 1. */
export interface Person {
  readonly id: string;
  readonly name: string;
  readonly role: Role | "Outside";
  readonly initials: string;
}

/** The shell: on every screen, and kept live. */
export interface ShellView {
  readonly workspace: { readonly id: string; readonly name: string; readonly address: string; readonly zone: string };
  readonly me: Person;
  readonly coworker: Identity;
  readonly tree: readonly {
    readonly id: string;
    readonly name: string;
    readonly above: string | null;
    readonly is: Rolled["is"];
    readonly icon: string;
    /** What it is doing now, in its own words: the palette shows it beside the name. */
    readonly now: string;
  }[];
  /** Everyone in the workspace, for `@` in the composer and the palette. */
  readonly people: readonly Person[];
  readonly chats: readonly Chat[];
  readonly inbox: number;
  /** How many triggers all managers have: the palette says it beside the page. */
  readonly triggers: number;
  readonly doings: readonly Doing[];
}

export interface HomeView {
  readonly suggestions: readonly {
    readonly id: string;
    /** The four groups of cards under the composer: set up, find out, get done, show me how. */
    readonly category: "set" | "know" | "do" | "learn";
    readonly heading: string;
    readonly about: string;
    readonly prompt: string;
    /** A card that opens a chat or a walk instead of filling the composer. */
    readonly link: string | null;
  }[];
  readonly recent: readonly Chat[];
}

/** An ask, or something to know. `look`: what it looked at before asking. */
export interface InboxItem {
  readonly ask: Ask;
  readonly from: string;
  readonly preview: string;
  readonly standing: "asks" | "waits" | "know" | "done";
  readonly proposes: boolean;
  readonly isNew: boolean;
  readonly looked: readonly string[];
  readonly otherwise: string | null;
  readonly links: readonly { readonly label: string; readonly link: string }[];
  /** An option that does not answer: it reminds, or it opens a page. Every other option answers. */
  readonly beside: Readonly<Record<string, { readonly is: "remind" } | { readonly is: "open"; readonly link: string }>>;
}
export interface InboxView {
  readonly items: readonly InboxItem[];
}

export interface ChatsView {
  readonly chats: readonly Chat[];
}
export interface ChatView {
  readonly chat: Chat;
  readonly lines: readonly (ChatLine & {
    /** What it looked up or ran for this line: not a change, so not a `did`. `took` in seconds, null while it runs. */
    readonly calls: readonly {
      readonly name: string;
      readonly target: string;
      readonly state: "done" | "running";
      readonly took: number | null;
    }[];
  })[];
  /** Under the line each was forked at (`knew` lines in), with how many lines it has. */
  readonly forks: readonly (Chat & { readonly replies: number })[];
}

/**
 * The change against the period before, as a share: 0.12 is 12% more. Two exceptions, both drawn so: for `of` it is the
 * difference in the count (1 is one more), and for `share` it is points of the share (0.031 is 3.1 points).
 */
export interface Tile {
  readonly id: string;
  readonly label: string;
  readonly value: number | null;
  readonly unit: "count" | "dollars" | "hours" | "share" | "of";
  readonly of?: number;
  readonly change: number | null;
  readonly better: "more" | "less";
  readonly points: readonly number[];
}

/** One day of the trends. `sentBack` is a share; `people` minutes of people's time; `wait` hours to a first answer. */
export interface Day {
  readonly day: number;
  readonly came: number;
  readonly out: number;
  readonly sentBack: number;
  readonly cost: number;
  readonly people: number;
  readonly wait: number;
}
export interface OverviewView {
  readonly period: "7" | "30" | "90";
  /** When it was read. */
  readonly updated: number;
  readonly tiles: readonly Tile[];
  /** The last 7 days, whatever the period: the trends are drawn day by day. */
  readonly daily: readonly Day[];
  /** The 7 days before those, one for one. */
  readonly dailyBefore: readonly Day[];
  readonly objectives: readonly {
    readonly manager: string;
    readonly name: string;
    readonly says: string;
    readonly standing: Standing;
    readonly is: Rolled["is"];
    /** How far from where it began to the aim, and how far it should be by today: 0 to 1. Not from `now` and `aim`: some are better when less. */
    readonly progress: number;
    readonly shouldBe: number;
    /** What `now` and `aim` count, to say them: "18 / 20", "3.1 h now". */
    readonly unit: "count" | "steps" | "hours" | "of";
  }[];
  readonly changed: readonly {
    readonly tone: "wrong" | "better" | "proposes";
    readonly title: string;
    readonly text: string;
    readonly link: string;
  }[];
}

export interface TreeRow extends Rolled {
  readonly name: string;
  readonly above: string | null;
  readonly job: string;
  readonly version: number;
  readonly connectors: readonly string[];
  /** MCP servers it was handed. */
  readonly mcp: readonly string[];
  readonly limit: number;
  readonly objective: string;
  readonly standing: Standing["_tag"] | "on its line" | "below its line" | "reached";
  readonly threads: number;
  /** What it is doing now, in its own words. */
  readonly now: string;
  /** When its playbook last changed. */
  readonly changed: number;
  /** The share of what it finished that a person sent back: 0 to 1. */
  readonly sentBack: number;
}
export interface TreeView {
  readonly rows: readonly TreeRow[];
  /** Who answers for the system. */
  readonly answers: readonly Person[];
  /** A version being tried on past work beside the one that runs. */
  readonly trying: readonly { readonly manager: string; readonly version: number; readonly against: number; readonly cases: number }[];
  readonly pages: readonly { readonly id: "Playbook" | "Notes" | "Trying now" | "Reach"; readonly text: string }[];
}

export interface CoworkerView {
  readonly identity: Identity;
  /** Since when an address has not worked, by connector: the page says why it is grey. */
  readonly offline: readonly { readonly connector: string; readonly since: number }[];
  readonly voice: "calm" | "bright" | "low";
  /** It says aloud what it is doing on the screen. */
  readonly aloud: boolean;
  readonly soul: string;
  /** Lines it does not cross, whoever asks. */
  readonly never: readonly string[];
  /** It may suggest a change to its own soul, and a person says yes or no. */
  readonly mayPropose: boolean;
  readonly talking: readonly Talking[];
  readonly triggers: readonly {
    readonly trigger: Trigger;
    readonly of: string;
    readonly next: number | null;
    readonly last: { readonly at: number; readonly says: string; readonly is: "done" | "asked" | "failed" } | null;
  }[];
  readonly skills: readonly Skill[];
  /** The skill that sets up a manager, judged by what people changed in its drafts (`skills` has it too). */
  readonly setUp: {
    readonly skill: string;
    readonly version: number;
    readonly since: number;
    /** The share of its drafts' lines nobody changed, and the aim. */
    readonly unchanged: { readonly now: number; readonly aim: number };
    /** Questions whose answer changed nothing, of all asked, and the version since which none of those is asked. */
    readonly noChange: { readonly count: number; readonly of: number; readonly goneSince: number };
    readonly trying: string;
    /** How many drafts there have been: a comment on a file is tried on all of them. */
    readonly drafts: number;
    /** Without the front matter. */
    readonly files: readonly { readonly name: string; readonly text: string }[];
  };
  readonly memory: readonly Note[];
  /** A correction waits as a proposed change to a note until a person accepts it. */
  readonly corrections: readonly {
    readonly id: string;
    readonly note: string;
    readonly was: string;
    readonly now: string;
    readonly by: string;
    readonly where: string;
    readonly at: number;
  }[];
  readonly may: readonly MayDo[];
  /** `part`: dollars a day each manager may use (`Part.part`); `used` is a day's average of the last 7. */
  readonly spending: { readonly whole: number; readonly tellAt: number; readonly parts: readonly Part[] };
  /** `undoLabel`: what going back is called, "Go back to version 5". */
  readonly history: readonly (Did & { readonly undoLabel: string | null })[];
}

export interface SearchView {
  readonly found: readonly {
    readonly is: "work" | "thread" | "manager" | "person" | "playbook" | "mail" | "deal" | "chat";
    readonly id: string;
    readonly title: string;
    readonly about: string;
    readonly link: string;
    readonly at: number;
  }[];
}

export interface TemplatesView {
  readonly templates: readonly (Omit<Template, "files"> & {
    /** `on`: the version of the template that manager's copy came from. */
    readonly managers: readonly { readonly id: string; readonly name: string; readonly behind: boolean; readonly on: number }[];
    /** A template of this workspace's: the manager it was saved from, and when. */
    readonly saved: { readonly from: string; readonly at: number } | null;
  })[];
}
